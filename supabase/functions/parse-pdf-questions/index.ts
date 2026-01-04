import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Canonical output schema - strict contract
interface ExtractedQuestion {
  question_id: string;
  question_order: number;
  question_text: string;
  answer_choices: {
    choice_id: string;
    choice_text: string;
    is_correct: boolean;
    explanation?: string;
  }[];
  correct_answer_id: string;
  explanation_text: string;
  images: {
    image_id: string;
    source: 'extracted' | 'screenshot' | 'described';
    description?: string;
    original_position: 'before_question' | 'inline' | 'after_question';
  }[];
  category?: string;
  validation: {
    text_complete: boolean;
    explanation_complete: boolean;
    images_handled: boolean;
  };
}

interface ExtractionResult {
  pdf_id: string;
  pdf_order_index: number;
  status: 'in_progress' | 'completed' | 'verified' | 'failed';
  questions: ExtractedQuestion[];
  final_validation: {
    all_questions_processed: boolean;
    all_images_handled: boolean;
    ready_for_next_pdf: boolean;
    failure_reason?: string;
  };
  metadata: {
    pdf_filename: string;
    processed_at: string;
    total_extracted: number;
    valid_count: number;
    validation_errors?: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, pdfFileName, pdfId, pdfOrderIndex, subject, system } = await req.json();
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ 
          error: 'MISSING_FROM_PDF',
          details: 'pdfBase64 is required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[START] Processing PDF: ${pdfFileName || 'unknown'}, ID: ${pdfId || 'none'}, Order: ${pdfOrderIndex || 0}`);
    console.log(`PDF base64 length: ${pdfBase64.length} characters`);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // SYSTEM PROMPT: Deterministic content transfer engine
    const systemPrompt = `You are an automated document-processing system.

ROLE:
You are NOT an assistant, tutor, editor, or analyst.
You are a deterministic content transfer engine.

PRIMARY OBJECTIVE:
Extract, preserve, and upload content from the PDF with ZERO modification.

ABSOLUTE RULES:
1. Process ALL questions in the PDF - no skipping
2. Extract VERBATIM - no paraphrasing, no summarizing, no rewriting
3. Preserve EXACT wording including any typos or formatting
4. Include COMPLETE explanations - never truncate
5. Identify ALL images/diagrams - describe what they show

PROHIBITIONS:
- No summarizing
- No rewriting
- No interpreting
- No guessing missing content
- No filling gaps
- No reordering questions
- No skipping questions
- No skipping images
- No providing your own answers

If any required content is missing or ambiguous in the source PDF:
Return that specific field as "MISSING_FROM_PDF" and continue processing.`;

    const userPrompt = `Extract ALL questions from this PDF following the EXACT schema below.

## EXTRACTION RULES (MANDATORY):

### A. QUESTION EXTRACTION
For EVERY question in the PDF:
- Extract the COMPLETE question text verbatim (including clinical vignettes)
- Extract ALL answer choices exactly as written
- Identify which answer is marked as correct
- Extract the COMPLETE explanation verbatim

### B. IMAGE HANDLING (ZERO TOLERANCE)
If a question contains ANY image, diagram, chart, or figure:
- Set has_image: true
- Describe exactly what the image shows (diagram type, labels, structures)
- Note the image position (before_question, inline, after_question)
- If you cannot see the image clearly, use "IMAGE_REQUIRED" as description

### C. EXPLANATION INTEGRITY
- Explanations must be COMPLETE and UNEDITED
- Include ALL text from the explanation section
- Preserve original paragraph structure
- If explanation is missing, use "MISSING_FROM_PDF"

### D. OUTPUT FORMAT (STRICT JSON):

{
  "questions": [
    {
      "question_number": 1,
      "question_text": "COMPLETE question text exactly as written in PDF",
      "options": [
        {"letter": "A", "text": "Option A text exactly as written", "is_correct": false},
        {"letter": "B", "text": "Option B text exactly as written", "is_correct": true},
        {"letter": "C", "text": "Option C text exactly as written", "is_correct": false},
        {"letter": "D", "text": "Option D text exactly as written", "is_correct": false},
        {"letter": "E", "text": "Option E text exactly as written", "is_correct": false}
      ],
      "explanation": "COMPLETE explanation text - every sentence, every paragraph",
      "has_image": false,
      "image_description": "Detailed description of any image/diagram",
      "image_position": "inline",
      "category": "Medical topic"
    }
  ],
  "total_questions_in_pdf": 5,
  "extraction_complete": true,
  "extraction_notes": "Any issues or ambiguities encountered"
}

## VALIDATION CHECKLIST (MUST PASS ALL):
- [ ] Every question has complete text
- [ ] Every question has at least 2 answer options
- [ ] Exactly ONE option is marked is_correct: true per question
- [ ] All explanations are included (or marked MISSING_FROM_PDF)
- [ ] All images are described (or marked IMAGE_REQUIRED)

Return ONLY valid JSON. No markdown code blocks. No extra commentary.`;

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
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.05, // Very low for deterministic output
        max_tokens: 100000,
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Vision API error:', visionResponse.status, errorText);
      
      if (visionResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'DO_NOT_PROCEED',
            details: 'Rate limit exceeded. Please wait before processing next PDF.',
            ready_for_next_pdf: false
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (visionResponse.status === 402) {
        throw new Error('API credits exhausted.');
      }
      
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionResult = await visionResponse.json();
    const content = visionResult.choices?.[0]?.message?.content || '';

    console.log('[STEP 2] Parsing extraction results...');
    console.log('Raw response length:', content.length);

    // Parse JSON response
    let rawQuestions: any[] = [];
    let extractionNotes = '';
    
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
      rawQuestions = parsed.questions || [];
      extractionNotes = parsed.extraction_notes || '';
      
      console.log(`Parsed ${rawQuestions.length} questions from response`);
      
      if (!Array.isArray(rawQuestions)) {
        rawQuestions = [rawQuestions];
      }

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content preview:', content.substring(0, 1000));
      
      return new Response(
        JSON.stringify({ 
          error: 'DO_NOT_PROCEED',
          details: 'Failed to parse AI response. The PDF may be unreadable or in an unsupported format.',
          ready_for_next_pdf: false
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 3: Strict validation
    console.log('[STEP 3] Validating extracted questions with strict rules...');
    
    const validatedQuestions: ExtractedQuestion[] = [];
    const validationErrors: string[] = [];
    
    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      const qNum = q.question_number || (i + 1);
      const questionId = `q_${pdfId}_${qNum}`;
      
      // Validation flags
      let textComplete = true;
      let explanationComplete = true;
      let imagesHandled = true;
      
      // Validate question text
      if (!q.question_text || q.question_text.length < 10) {
        validationErrors.push(`Q${qNum}: MISSING_FROM_PDF - Question text missing or too short`);
        textComplete = false;
        continue; // Cannot proceed without question text
      }
      
      // Validate options
      if (!Array.isArray(q.options) || q.options.length < 2) {
        validationErrors.push(`Q${qNum}: MISSING_FROM_PDF - Missing or insufficient answer options`);
        continue;
      }
      
      // Ensure correct answer is marked
      let hasCorrect = q.options.some((o: any) => o.is_correct);
      let correctAnswerId = '';
      
      if (!hasCorrect) {
        // Try to find correct answer from other fields
        const correctAnswer = q.correct_answer || q.answer;
        if (correctAnswer) {
          const option = q.options.find((o: any) => o.letter === correctAnswer);
          if (option) {
            option.is_correct = true;
            hasCorrect = true;
          }
        }
      }
      
      if (!hasCorrect) {
        validationErrors.push(`Q${qNum}: MISSING_FROM_PDF - No correct answer identified`);
        continue;
      }
      
      // Get correct answer ID
      const correctOption = q.options.find((o: any) => o.is_correct);
      correctAnswerId = correctOption?.letter || '';
      
      // Validate explanation
      const explanation = q.explanation || '';
      if (!explanation || explanation === 'MISSING_FROM_PDF' || explanation.length < 5) {
        explanationComplete = false;
        validationErrors.push(`Q${qNum}: Explanation incomplete or missing`);
      }
      
      // Handle images
      const images: ExtractedQuestion['images'] = [];
      if (q.has_image) {
        const imageDesc = q.image_description || 'IMAGE_REQUIRED';
        if (imageDesc === 'IMAGE_REQUIRED' || !imageDesc) {
          imagesHandled = false;
          validationErrors.push(`Q${qNum}: IMAGE_REQUIRED - Image detected but not described`);
        }
        images.push({
          image_id: `img_${questionId}_1`,
          source: 'described',
          description: imageDesc,
          original_position: q.image_position || 'inline'
        });
      }
      
      // Build validated question
      validatedQuestions.push({
        question_id: questionId,
        question_order: qNum,
        question_text: cleanText(q.question_text),
        answer_choices: q.options.map((opt: any, idx: number) => ({
          choice_id: `${questionId}_${opt.letter || String.fromCharCode(65 + idx)}`,
          choice_text: cleanText(opt.text),
          is_correct: opt.is_correct || false,
          explanation: opt.explanation ? cleanText(opt.explanation) : undefined
        })),
        correct_answer_id: correctAnswerId,
        explanation_text: cleanText(explanation || 'MISSING_FROM_PDF'),
        images,
        category: q.category || 'General',
        validation: {
          text_complete: textComplete,
          explanation_complete: explanationComplete,
          images_handled: imagesHandled
        }
      });
    }

    // Final validation gate
    const allQuestionsProcessed = validatedQuestions.length > 0;
    const allImagesHandled = validatedQuestions.every(q => q.validation.images_handled);
    const hasBlockingErrors = validationErrors.some(e => 
      e.includes('MISSING_FROM_PDF') && e.includes('Question text')
    );
    
    const readyForNextPdf = allQuestionsProcessed && !hasBlockingErrors;
    
    console.log(`[COMPLETE] ${validatedQuestions.length} valid questions extracted`);
    console.log(`Ready for next PDF: ${readyForNextPdf}`);

    // Build response following canonical schema
    const result: ExtractionResult = {
      pdf_id: pdfId || crypto.randomUUID(),
      pdf_order_index: pdfOrderIndex || 0,
      status: validatedQuestions.length === 0 ? 'failed' : readyForNextPdf ? 'completed' : 'in_progress',
      questions: validatedQuestions,
      final_validation: {
        all_questions_processed: allQuestionsProcessed,
        all_images_handled: allImagesHandled,
        ready_for_next_pdf: readyForNextPdf,
        failure_reason: !readyForNextPdf ? validationErrors[0] : undefined
      },
      metadata: {
        pdf_filename: pdfFileName || 'unknown',
        processed_at: new Date().toISOString(),
        total_extracted: rawQuestions.length,
        valid_count: validatedQuestions.length,
        validation_errors: validationErrors.length > 0 ? validationErrors : undefined
      }
    };

    // Convert to legacy format for backward compatibility with frontend
    const legacyQuestions = validatedQuestions.map(q => ({
      question_text: q.question_text,
      options: q.answer_choices.map(c => ({
        letter: c.choice_id.split('_').pop() || 'A',
        text: c.choice_text,
        is_correct: c.is_correct,
        explanation: c.explanation
      })),
      explanation: q.explanation_text,
      category: q.category,
      has_image: q.images.length > 0,
      image_description: q.images[0]?.description,
      subject: subject || 'General',
      system: system || 'General'
    }));

    return new Response(
      JSON.stringify({ 
        success: readyForNextPdf,
        questions: legacyQuestions,
        totalExtracted: rawQuestions.length,
        validCount: validatedQuestions.length,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        // Include new strict schema data
        extraction_result: result,
        metadata: {
          pdfFileName,
          pdfId,
          processedAt: new Date().toISOString(),
          ready_for_next_pdf: readyForNextPdf
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF';
    console.error('[ERROR] PDF processing failed:', errorMessage);
    return new Response(
      JSON.stringify({ 
        error: 'DO_NOT_PROCEED',
        details: errorMessage,
        ready_for_next_pdf: false
      }),
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
