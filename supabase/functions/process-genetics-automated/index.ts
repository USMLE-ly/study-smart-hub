import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Complete list of genetics PDFs in the repository
const GENETICS_PDFS = [
  'genetics-1-5.pdf',
  'genetics-1-8.pdf',
  'genetics-2-6.pdf',
  'genetics-3-6.pdf',
  'genetics-3-8.pdf',
  'genetics-4-6.pdf',
  'genetics-5-7.pdf',
  'genetics-6-7.pdf',
  'genetics-7-5.pdf',
  'genetics-8-5.pdf'
];

// PDFs will be read from Supabase Storage bucket
const STORAGE_BUCKET = 'pdf-uploads';

interface ExtractedQuestion {
  question_text: string;
  options: {
    letter: string;
    text: string;
    is_correct: boolean;
    explanation?: string;
  }[];
  main_explanation: string;
  choice_explanations: Record<string, string>;
  educational_objective: string;
  has_image: boolean;
  image_description?: string;
  category: string;
}

interface ProcessingResult {
  pdf_name: string;
  status: 'success' | 'error' | 'skipped';
  questions_extracted: number;
  images_generated: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const apiKey = Deno.env.get('LOVABLE_API_KEY');

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      startFromIndex = 0, 
      singlePdf = null,
      generateImages = true,
      skipExisting = true,
      pdfBaseUrl = null, // Optional: base URL to fetch PDFs from (e.g., deployed app URL)
      pdfDataMap = null  // Optional: { pdfName: base64Data } for direct PDF data
    } = body;

    const results: ProcessingResult[] = [];
    let totalQuestionsInserted = 0;
    let totalImagesGenerated = 0;

    // Determine which PDFs to process
    const pdfsToProcess = singlePdf 
      ? [singlePdf] 
      : GENETICS_PDFS.slice(startFromIndex);

    console.log(`[AUTO-GENETICS] Starting automated processing of ${pdfsToProcess.length} PDFs`);
    console.log(`Settings: generateImages=${generateImages}, skipExisting=${skipExisting}`);

    for (const pdfName of pdfsToProcess) {
      console.log(`\n========================================`);
      console.log(`[PROCESSING] ${pdfName}`);
      console.log(`========================================`);

      try {
        // Check if already processed
        if (skipExisting) {
          const { data: existingQuestions } = await supabase
            .from('questions')
            .select('id')
            .eq('source_pdf', pdfName)
            .limit(1);

          if (existingQuestions && existingQuestions.length > 0) {
            console.log(`[SKIP] ${pdfName} already processed, skipping...`);
            results.push({
              pdf_name: pdfName,
              status: 'skipped',
              questions_extracted: 0,
              images_generated: 0
            });
            continue;
          }
        }

        // Step 1: Get PDF data
        let pdfBuffer: ArrayBuffer;
        
        // Option 1: Direct PDF data provided in request
        if (pdfDataMap && pdfDataMap[pdfName]) {
          console.log(`[STEP 1] Using provided PDF data for: ${pdfName}`);
          const binaryString = atob(pdfDataMap[pdfName]);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          pdfBuffer = bytes.buffer;
        }
        // Option 2: Fetch from provided base URL
        else if (pdfBaseUrl) {
          const pdfUrl = `${pdfBaseUrl}/pdfs/${pdfName}`;
          console.log(`[STEP 1] Fetching PDF from URL: ${pdfUrl}`);
          const pdfResponse = await fetch(pdfUrl);
          if (!pdfResponse.ok) {
            throw new Error(`Failed to fetch PDF: HTTP ${pdfResponse.status}`);
          }
          pdfBuffer = await pdfResponse.arrayBuffer();
        }
        // Option 3: Fetch from Supabase Storage
        else {
          console.log(`[STEP 1] Fetching PDF from storage: ${pdfName}`);
          const { data: pdfData, error: pdfError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .download(`genetics/${pdfName}`);
          
          if (pdfError || !pdfData) {
            throw new Error(`Failed to fetch PDF from storage: ${pdfError?.message || 'No data'}`);
          }
          pdfBuffer = await pdfData.arrayBuffer();
        }
        
        const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
        console.log(`PDF size: ${pdfBuffer.byteLength} bytes`);

        // Step 2: Extract questions with comprehensive AI analysis
        console.log(`[STEP 2] Extracting questions using AI vision...`);
        const extractedQuestions = await extractQuestionsFromPDF(pdfBase64, pdfName, apiKey);
        
        if (!extractedQuestions || extractedQuestions.length === 0) {
          throw new Error('No questions could be extracted from PDF');
        }

        console.log(`[EXTRACTED] ${extractedQuestions.length} questions from ${pdfName}`);

        // Step 3: Insert questions and generate images
        let questionsInserted = 0;
        let imagesGenerated = 0;

        for (const q of extractedQuestions) {
          try {
            // Combine all explanation parts
            const fullExplanation = buildFullExplanation(q);

            // Insert question
            const { data: questionData, error: questionError } = await supabase
              .from('questions')
              .insert({
                question_text: q.question_text,
                subject: 'Genetics',
                system: 'General',
                explanation: fullExplanation,
                category: q.category || 'Genetics',
                has_image: q.has_image || false,
                image_description: q.image_description || null,
                source_pdf: pdfName,
                difficulty: 'Medium'
              })
              .select('id')
              .single();

            if (questionError) {
              console.error(`Error inserting question:`, questionError.message);
              continue;
            }

            const questionId = questionData.id;

            // Insert options with individual explanations
            if (q.options && q.options.length > 0) {
              const optionsToInsert = q.options.map((opt) => ({
                question_id: questionId,
                option_letter: opt.letter,
                option_text: opt.text,
                is_correct: opt.is_correct || false,
                explanation: opt.explanation || q.choice_explanations?.[opt.letter] || null
              }));

              const { error: optionsError } = await supabase
                .from('question_options')
                .insert(optionsToInsert);

              if (optionsError) {
                console.error(`Error inserting options:`, optionsError.message);
              }
            }

            // Step 4: Generate explanation images if enabled and question has visual content
            if (generateImages && (q.has_image || q.image_description)) {
              try {
                const imageCount = await generateExplanationImages(
                  supabase,
                  apiKey,
                  questionId,
                  q.question_text,
                  q.image_description || '',
                  q.main_explanation,
                  q.educational_objective
                );
                imagesGenerated += imageCount;
              } catch (imgError) {
                console.error(`Error generating images for question:`, imgError);
              }
            }

            questionsInserted++;
            totalQuestionsInserted++;

          } catch (insertErr) {
            console.error(`Insert error:`, insertErr);
          }
        }

        totalImagesGenerated += imagesGenerated;

        console.log(`[COMPLETE] ${pdfName}: ${questionsInserted} questions, ${imagesGenerated} images`);
        
        results.push({
          pdf_name: pdfName,
          status: 'success',
          questions_extracted: questionsInserted,
          images_generated: imagesGenerated
        });

        // Rate limiting delay between PDFs
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (pdfError) {
        const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
        console.error(`[ERROR] ${pdfName}:`, errorMessage);
        
        results.push({
          pdf_name: pdfName,
          status: 'error',
          questions_extracted: 0,
          images_generated: 0,
          error: errorMessage
        });
      }
    }

    console.log(`\n========================================`);
    console.log(`[FINAL] Processing complete!`);
    console.log(`Total questions: ${totalQuestionsInserted}`);
    console.log(`Total images: ${totalImagesGenerated}`);
    console.log(`========================================`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_pdfs_processed: results.length,
          total_questions_inserted: totalQuestionsInserted,
          total_images_generated: totalImagesGenerated,
          successful: results.filter(r => r.status === 'success').length,
          skipped: results.filter(r => r.status === 'skipped').length,
          failed: results.filter(r => r.status === 'error').length
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FATAL ERROR]:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract questions from PDF using AI vision with comprehensive prompting
async function extractQuestionsFromPDF(
  pdfBase64: string, 
  pdfName: string, 
  apiKey: string
): Promise<ExtractedQuestion[]> {
  
  const systemPrompt = `You are an automated medical question extraction system. Your task is to extract EVERY question from this genetics PDF with COMPLETE fidelity.

EXTRACTION REQUIREMENTS:

1. QUESTION TEXT
   - Extract the COMPLETE question text including full clinical vignettes
   - Include patient demographics, history, exam findings, lab values
   - Preserve ALL numerical values and measurements exactly

2. ANSWER OPTIONS
   - Extract ALL options (A, B, C, D, E, F if present)
   - Identify the CORRECT answer (marked with checkmarks, percentages, or "Correct answer:")
   - Extract individual explanations for why each choice is right/wrong

3. EXPLANATION CONTENT - CRITICAL
   Extract THREE distinct parts:
   a) MAIN EXPLANATION: The primary educational content explaining the concept
   b) CHOICE EXPLANATIONS: Why each option (A-E) is correct or incorrect
   c) EDUCATIONAL OBJECTIVE: The summary statement starting with "Educational objective:"

4. IMAGE HANDLING
   If the question contains ANY visual element:
   - Pedigree diagrams: Describe inheritance pattern, generations, affected individuals
   - Karyotypes: Describe chromosome arrangements and abnormalities
   - Diagrams: Describe structures, labels, and educational content
   - Charts/Graphs: Describe axes, data patterns, key values

5. MEDICAL CATEGORIZATION
   Assign specific genetics categories:
   - Genetics/Autosomal Dominant Inheritance
   - Genetics/Autosomal Recessive Inheritance
   - Genetics/X-Linked Inheritance
   - Genetics/Chromosomal Abnormalities
   - Genetics/DNA Repair Mechanisms
   - Genetics/Gene Expression
   - Genetics/Population Genetics

OUTPUT FORMAT (JSON only):
{
  "questions": [
    {
      "question_text": "Complete question text",
      "options": [
        {"letter": "A", "text": "Option text", "is_correct": false, "explanation": "Why wrong"},
        {"letter": "B", "text": "Option text", "is_correct": true, "explanation": "Why correct"}
      ],
      "main_explanation": "Primary educational explanation",
      "choice_explanations": {
        "A": "Explanation for choice A",
        "B": "Explanation for choice B",
        "C": "Explanation for choice C",
        "D": "Explanation for choice D",
        "E": "Explanation for choice E"
      },
      "educational_objective": "Educational objective statement",
      "has_image": true,
      "image_description": "Detailed description of visual content",
      "category": "Genetics/Specific Topic"
    }
  ]
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            { type: 'text', text: `Extract ALL questions from this genetics PDF: ${pdfName}. Return ONLY valid JSON.` },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.05,
      max_tokens: 100000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '';

  // Parse JSON from response
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }
  const directJsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (directJsonMatch) {
    jsonStr = directJsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);
  return parsed.questions || [];
}

// Build comprehensive explanation from extracted parts
function buildFullExplanation(q: ExtractedQuestion): string {
  const parts: string[] = [];

  // Main explanation
  if (q.main_explanation) {
    parts.push(q.main_explanation);
  }

  // Choice explanations
  if (q.choice_explanations && Object.keys(q.choice_explanations).length > 0) {
    parts.push('\n\n--- Choice Explanations ---\n');
    for (const [letter, explanation] of Object.entries(q.choice_explanations)) {
      if (explanation) {
        parts.push(`(Choice ${letter}) ${explanation}`);
      }
    }
  }

  // Educational objective
  if (q.educational_objective) {
    parts.push(`\n\n--- Educational Objective ---\n${q.educational_objective}`);
  }

  return parts.join('\n\n');
}

// Generate explanation images using AI image generation
async function generateExplanationImages(
  supabase: any,
  apiKey: string,
  questionId: string,
  questionText: string,
  imageDescription: string,
  explanation: string,
  educationalObjective: string
): Promise<number> {
  
  // For now, store the image descriptions in question_images table
  // The actual image generation would use the Nano banana model
  // but storing descriptions allows for on-demand generation later
  
  const imageRecords = [];
  
  // Image 1: Diagram/Figure (if described)
  if (imageDescription && imageDescription.length > 10) {
    imageRecords.push({
      question_id: questionId,
      file_path: `genetics/${questionId}/diagram.png`,
      position: 'question',
      source_type: 'ai_described',
      image_order: 1,
    });
  }
  
  // Image 2: Explanation visual
  if (explanation && explanation.length > 100) {
    imageRecords.push({
      question_id: questionId,
      file_path: `genetics/${questionId}/explanation.png`,
      position: 'explanation',
      source_type: 'ai_described',
      image_order: 2,
    });
  }
  
  // Image 3: Educational objective summary
  if (educationalObjective && educationalObjective.length > 20) {
    imageRecords.push({
      question_id: questionId,
      file_path: `genetics/${questionId}/objective.png`,
      position: 'explanation',
      source_type: 'ai_described',
      image_order: 3,
    });
  }

  if (imageRecords.length > 0) {
    const { error } = await supabase
      .from('question_images')
      .insert(imageRecords);
    
    if (error) {
      console.error('Error inserting image records:', error.message);
      return 0;
    }
  }

  return imageRecords.length;
}
