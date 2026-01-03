import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedQuestion {
  question_text: string;
  options: { letter: string; text: string; is_correct: boolean; explanation?: string }[];
  explanation: string;
  category?: string;
  has_image?: boolean;
  image_description?: string;
  question_image_url?: string;
  explanation_image_url?: string;
  subject?: string;
  system?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, pdfFileName, pdfId, subject, system } = await req.json();
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'pdfBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[START] Processing PDF: ${pdfFileName || 'unknown'}, ID: ${pdfId || 'none'}`);
    console.log(`PDF base64 length: ${pdfBase64.length} characters`);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use Gemini 2.5 Pro for better PDF understanding
    // Send as data URL with PDF mime type for vision processing
    console.log('[STEP 1] Sending PDF to vision model for extraction...');
    
    const visionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: `You are a USMLE question extraction system. Extract ALL questions from this PDF with ABSOLUTE PRECISION.

## CRITICAL EXTRACTION RULES (MANDATORY):

1. **EXTRACT EVERY QUESTION** - Do not skip any question
2. **VERBATIM TEXT** - Copy text exactly as written, no paraphrasing
3. **ALL OPTIONS** - Include every answer choice (A, B, C, D, E, etc.)
4. **FULL EXPLANATIONS** - Include complete explanation text, never truncate
5. **IDENTIFY CORRECT ANSWER** - Mark which option is correct
6. **IMAGE DETECTION** - If question has images/diagrams, set has_image: true and describe what the image shows

## OUTPUT FORMAT (JSON ONLY):

{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Complete question text including clinical vignette exactly as written",
      "options": [
        {"letter": "A", "text": "Option A text exactly as written", "is_correct": false},
        {"letter": "B", "text": "Option B text exactly as written", "is_correct": true},
        {"letter": "C", "text": "Option C text exactly as written", "is_correct": false},
        {"letter": "D", "text": "Option D text exactly as written", "is_correct": false},
        {"letter": "E", "text": "Option E text exactly as written", "is_correct": false}
      ],
      "explanation": "COMPLETE explanation text - copy everything",
      "has_image": false,
      "image_description": "Description of any image/diagram if present",
      "category": "Medical topic/system"
    }
  ],
  "total_questions": 5,
  "extraction_notes": "Any issues encountered"
}

## VALIDATION BEFORE RESPONDING:
- Every question has complete text
- Every question has at least 2 options
- Exactly ONE option is marked is_correct: true per question
- Explanations are included (if present in PDF)

Return ONLY valid JSON. No markdown code blocks. No extra text.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 100000,
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Vision API error:', visionResponse.status, errorText);
      
      if (visionResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (visionResponse.status === 402) {
        throw new Error('API credits exhausted.');
      }
      
      throw new Error(`Vision API error: ${visionResponse.status} - ${errorText.substring(0, 200)}`);
    }

    const visionResult = await visionResponse.json();
    const content = visionResult.choices?.[0]?.message?.content || '';

    console.log('[STEP 2] Parsing extraction results...');
    console.log('Raw response length:', content.length);

    // Parse JSON response
    let questions: ParsedQuestion[] = [];
    
    try {
      let jsonStr = content;
      
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      // Find JSON object
      const directJsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (directJsonMatch) {
        jsonStr = directJsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonStr);
      questions = parsed.questions || [];
      
      console.log(`Parsed ${questions.length} questions from response`);
      
      if (!Array.isArray(questions)) {
        questions = [questions];
      }

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content preview:', content.substring(0, 1000));
      throw new Error('Failed to parse AI response. The PDF may be unreadable or in an unsupported format.');
    }

    // Validate and clean questions
    console.log('[STEP 3] Validating extracted questions...');
    
    const validQuestions: ParsedQuestion[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = i + 1;
      
      // Validate question text
      if (!q.question_text || q.question_text.length < 10) {
        errors.push(`Q${qNum}: Missing or too short question text`);
        continue;
      }
      
      // Validate options
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Q${qNum}: Missing or insufficient options`);
        continue;
      }
      
      // Ensure correct answer is marked
      let hasCorrect = q.options.some(o => o.is_correct);
      if (!hasCorrect) {
        const correctAnswer = (q as any).correct_answer;
        if (correctAnswer) {
          const option = q.options.find(o => o.letter === correctAnswer);
          if (option) {
            option.is_correct = true;
            hasCorrect = true;
          }
        }
      }
      
      if (!hasCorrect) {
        errors.push(`Q${qNum}: No correct answer identified`);
        continue;
      }
      
      // Clean and add question
      validQuestions.push({
        question_text: cleanText(q.question_text),
        options: q.options.map(opt => ({
          letter: opt.letter,
          text: cleanText(opt.text),
          is_correct: opt.is_correct,
          explanation: opt.explanation ? cleanText(opt.explanation) : undefined
        })),
        explanation: cleanText(q.explanation || ''),
        category: q.category || 'General',
        has_image: q.has_image || false,
        image_description: q.image_description || '',
        question_image_url: q.question_image_url,
        explanation_image_url: q.explanation_image_url,
        subject: subject || 'General',
        system: system || 'General'
      });
    }

    if (errors.length > 0) {
      console.warn('Validation errors:', errors);
    }

    console.log(`[COMPLETE] ${validQuestions.length} valid questions extracted`);

    if (validQuestions.length === 0) {
      throw new Error('No valid questions could be extracted from this PDF. Please check the PDF format.');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        questions: validQuestions,
        totalExtracted: questions.length,
        validCount: validQuestions.length,
        validationErrors: errors.length > 0 ? errors : undefined,
        metadata: {
          pdfFileName,
          pdfId,
          processedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF';
    console.error('[ERROR] PDF processing failed:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/CamScanner/gi, '')
    .replace(/CS\s*CamScanner/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{3,}/g, ' ')
    .trim();
}
