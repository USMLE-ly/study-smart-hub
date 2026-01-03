import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
}

interface ImageAnalysis {
  description: string;
  associated_question: string;
  image_type: string;
  medical_content: string;
  page_location: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, pdfBase64, pdfFileName, subject, system, extractImages } = await req.json();
    
    // For automated processing, pdfBase64 is required
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'pdfBase64 is required for automated processing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AUTOMATED] Processing PDF: ${pdfFileName || 'unknown'}`);
    console.log(`PDF base64 length: ${pdfBase64.length} characters`);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // STEP 1: Extract text and analyze images using vision model
    console.log('[STEP 1] Analyzing PDF with vision model...');
    
    const visionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: `You are a medical education PDF processor. Your task is to extract ALL content from this PDF with ABSOLUTE PRECISION.

CRITICAL RULES (MANDATORY - NO EXCEPTIONS):
1. Extract EVERY question exactly as written - no skipping
2. Extract EVERY answer option exactly as written
3. Extract EVERY explanation VERBATIM - do not summarize
4. For EVERY image/diagram/figure: describe it in detail
5. Associate each image with its correct question
6. Preserve original numbering and order
7. Do NOT infer, guess, or fill in missing content
8. Do NOT answer questions yourself
9. If content is unclear, mark it as [UNCLEAR] but still include it

EXTRACTION FORMAT - Return JSON:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Full question text including clinical vignette",
      "options": [
        {"letter": "A", "text": "Option text exactly as written", "is_correct": false},
        {"letter": "B", "text": "Option text exactly as written", "is_correct": true}
      ],
      "correct_answer": "B",
      "explanation": "FULL explanation text - do NOT truncate or summarize",
      "has_image": true,
      "image_description": "Detailed description of the image/diagram",
      "image_location": "before_question | within_question | after_explanation",
      "category": "Specific medical topic"
    }
  ],
  "metadata": {
    "total_questions": number,
    "total_images": number,
    "extraction_complete": boolean
  }
}

VALIDATION BEFORE RESPONSE:
- Every question has text
- Every question has at least 2 options
- Every question has exactly one correct answer
- Every explanation is present and complete
- Every image is described and linked to its question

Return ONLY valid JSON. No markdown. No extra text.`
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
        temperature: 0.05, // Very low for precision
        max_tokens: 64000, // Maximum for full content
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Vision API error:', errorText);
      
      if (visionResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (visionResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'API credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionResult = await visionResponse.json();
    const content = visionResult.choices?.[0]?.message?.content || '';

    console.log('[STEP 2] Parsing extraction results...');
    console.log('Raw response length:', content.length);

    // Parse the JSON response
    let questions: ParsedQuestion[] = [];
    let metadata: any = {};
    
    try {
      // Clean the response - remove markdown code blocks if present
      let jsonStr = content;
      
      // Try to extract JSON from markdown code blocks
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
      metadata = parsed.metadata || {};
      
      console.log(`Parsed ${questions.length} questions from response`);
      
      if (!Array.isArray(questions)) {
        questions = [questions];
      }

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content preview:', content.substring(0, 2000));
      throw new Error('Failed to parse AI response as valid JSON. PDF may be unreadable or corrupted.');
    }

    // STEP 3: Validate extracted questions
    console.log('[STEP 3] Validating extracted questions...');
    
    const validationErrors: string[] = [];
    
    const validQuestions = questions.filter((q, index) => {
      const questionNum = index + 1;
      
      // Validate question text
      if (!q.question_text || q.question_text.length < 10) {
        validationErrors.push(`Q${questionNum}: Missing or too short question text`);
        return false;
      }
      
      // Validate options
      if (!Array.isArray(q.options) || q.options.length < 2) {
        validationErrors.push(`Q${questionNum}: Missing or insufficient options`);
        return false;
      }
      
      // Validate correct answer
      const hasCorrectAnswer = q.options.some(o => o.is_correct);
      if (!hasCorrectAnswer) {
        // Try to infer from correct_answer field if present
        const correctLetter = (q as any).correct_answer;
        if (correctLetter) {
          const option = q.options.find(o => o.letter === correctLetter);
          if (option) {
            option.is_correct = true;
          }
        }
        
        if (!q.options.some(o => o.is_correct)) {
          validationErrors.push(`Q${questionNum}: No correct answer marked`);
          return false;
        }
      }
      
      return true;
    }).map((q, index) => {
      // Clean and enrich each question
      return {
        question_text: cleanText(q.question_text),
        options: q.options.map(opt => ({
          letter: opt.letter,
          text: cleanText(opt.text),
          is_correct: opt.is_correct,
          explanation: opt.explanation ? cleanText(opt.explanation) : undefined
        })),
        explanation: cleanText(q.explanation || ''),
        category: q.category || subject || 'General',
        has_image: q.has_image || false,
        image_description: q.image_description || '',
        question_image_url: q.question_image_url,
        explanation_image_url: q.explanation_image_url,
        subject: subject || 'General',
        system: system || 'General'
      };
    });

    // Log validation results
    if (validationErrors.length > 0) {
      console.warn('Validation warnings:', validationErrors);
    }

    console.log(`[STEP 4] Extraction complete: ${validQuestions.length} valid questions`);
    console.log(`Questions with images: ${validQuestions.filter(q => q.has_image).length}`);

    // Return results
    return new Response(
      JSON.stringify({ 
        success: true, 
        questions: validQuestions,
        totalExtracted: questions.length,
        validCount: validQuestions.length,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        metadata: {
          ...metadata,
          pdfFileName,
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

// Helper function to clean extracted text
function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/CamScanner/gi, '')
    .replace(/CS\s*CamScanner/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{3,}/g, ' ')
    .trim();
}
