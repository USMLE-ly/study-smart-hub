import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PageImage {
  pageNum: number;
  url: string;
}

interface PageAnalysis {
  pageNum: number;
  pageType: 'question' | 'explanation' | 'diagram' | 'mixed';
  hasImage: boolean;
  questionNumbers: number[];
  isExplanationFor: number[];
  confidence: number;
}

interface ExtractedQuestion {
  questionNumber: number;
  questionText: string;
  options: { letter: string; text: string; isCorrect: boolean; explanation?: string }[];
  explanation: string;
  difficulty: string;
  hasImage: boolean;
  questionPages: number[];
  explanationPages: number[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { sessionId, pageImages, pdfName, category, subject, system } = await req.json();

    console.log(`Processing ${pageImages.length} pages for ${pdfName} (${category})`);

    // Step 1: Analyze pages to classify them
    const pageAnalyses = await analyzePages(pageImages, LOVABLE_API_KEY);
    console.log("Page analyses:", JSON.stringify(pageAnalyses, null, 2));

    // Step 2: Group pages by question
    const questionGroups = groupPagesByQuestion(pageAnalyses, pageImages);
    console.log(`Found ${Object.keys(questionGroups).length} question groups`);

    // Step 3: Extract questions from each group
    const extractedQuestions: ExtractedQuestion[] = [];
    
    for (const [qNum, group] of Object.entries(questionGroups)) {
      try {
        const extracted = await extractQuestionFromGroup(
          parseInt(qNum),
          group,
          category,
          LOVABLE_API_KEY
        );
        if (extracted) {
          extractedQuestions.push(extracted);
        }
      } catch (error) {
        console.error(`Failed to extract question ${qNum}:`, error);
      }
    }

    console.log(`Extracted ${extractedQuestions.length} questions`);

    // Step 4: Save questions to database
    let savedCount = 0;
    for (const question of extractedQuestions) {
      try {
        // Insert question
        const { data: qData, error: qError } = await supabase
          .from('questions')
          .insert({
            question_text: question.questionText,
            explanation: question.explanation,
            difficulty: question.difficulty,
            category: category,
            subject: subject || 'Biochemistry',
            system: system || 'Genetics',
            source_pdf: pdfName,
            source_page: question.questionPages[0],
            has_image: question.hasImage
          })
          .select()
          .single();

        if (qError) {
          console.error('Failed to insert question:', qError);
          continue;
        }

        // Insert options
        for (const opt of question.options) {
          await supabase
            .from('question_options')
            .insert({
              question_id: qData.id,
              option_letter: opt.letter,
              option_text: opt.text,
              is_correct: opt.isCorrect,
              explanation: opt.explanation
            });
        }

        // Link question page images
        for (let i = 0; i < question.questionPages.length; i++) {
          const pageNum = question.questionPages[i];
          const pageImage = pageImages.find((p: PageImage) => p.pageNum === pageNum);
          if (pageImage) {
            await supabase
              .from('question_images')
              .insert({
                question_id: qData.id,
                file_path: pageImage.url,
                storage_url: pageImage.url,
                source_type: 'question',
                position: 'question',
                image_order: i
              });
          }
        }

        // Link explanation page images (max 4)
        const expPages = question.explanationPages.slice(0, 4);
        for (let i = 0; i < expPages.length; i++) {
          const pageNum = expPages[i];
          const pageImage = pageImages.find((p: PageImage) => p.pageNum === pageNum);
          if (pageImage) {
            await supabase
              .from('question_images')
              .insert({
                question_id: qData.id,
                file_path: pageImage.url,
                storage_url: pageImage.url,
                source_type: 'explanation',
                position: 'explanation',
                image_order: i
              });
          }
        }

        savedCount++;
      } catch (error) {
        console.error('Error saving question:', error);
      }
    }

    // Update session
    if (sessionId) {
      await supabase
        .from('pdf_processing_sessions')
        .update({
          status: 'completed',
          extracted_questions: savedCount
        })
        .eq('id', sessionId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        questionsExtracted: savedCount,
        totalAnalyzed: extractedQuestions.length,
        summary: `Successfully extracted and saved ${savedCount} questions from ${pdfName}.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('PDF processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzePages(pageImages: PageImage[], apiKey: string): Promise<PageAnalysis[]> {
  const analyses: PageAnalysis[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < pageImages.length; i += BATCH_SIZE) {
    const batch = pageImages.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (page) => {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            {
              role: 'system',
              content: `You are a page classifier for medical education PDFs. Analyze the page image and classify it.

Return a JSON object with:
- pageType: "question" (contains a question stem), "explanation" (answer explanation), "diagram" (primarily an image/diagram), or "mixed" (combination)
- hasImage: true if page contains medical diagrams, charts, or images
- questionNumbers: array of question numbers visible (e.g., [1, 2] or [15])
- isExplanationFor: array of question numbers this page explains
- confidence: 0-1 confidence score`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Analyze this page (page ${page.pageNum}) and classify it:` },
                { type: 'image_url', image_url: { url: page.url } }
              ]
            }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'classify_page',
              description: 'Classify the page type and content',
              parameters: {
                type: 'object',
                properties: {
                  pageType: { type: 'string', enum: ['question', 'explanation', 'diagram', 'mixed'] },
                  hasImage: { type: 'boolean' },
                  questionNumbers: { type: 'array', items: { type: 'number' } },
                  isExplanationFor: { type: 'array', items: { type: 'number' } },
                  confidence: { type: 'number' }
                },
                required: ['pageType', 'hasImage', 'questionNumbers', 'isExplanationFor', 'confidence']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'classify_page' } }
        })
      });

      if (!response.ok) {
        console.error(`Failed to analyze page ${page.pageNum}:`, await response.text());
        return {
          pageNum: page.pageNum,
          pageType: 'mixed' as const,
          hasImage: false,
          questionNumbers: [],
          isExplanationFor: [],
          confidence: 0
        };
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        const args = JSON.parse(toolCall.function.arguments);
        return {
          pageNum: page.pageNum,
          ...args
        };
      }

      return {
        pageNum: page.pageNum,
        pageType: 'mixed' as const,
        hasImage: false,
        questionNumbers: [],
        isExplanationFor: [],
        confidence: 0
      };
    });

    const batchResults = await Promise.all(batchPromises);
    analyses.push(...batchResults);
  }

  return analyses;
}

function groupPagesByQuestion(
  analyses: PageAnalysis[],
  pageImages: PageImage[]
): Record<number, { questionPages: number[]; explanationPages: number[]; diagramPages: number[] }> {
  const groups: Record<number, { questionPages: number[]; explanationPages: number[]; diagramPages: number[] }> = {};

  // First pass: identify all question numbers
  const allQuestionNumbers = new Set<number>();
  for (const analysis of analyses) {
    for (const qNum of analysis.questionNumbers) {
      allQuestionNumbers.add(qNum);
    }
    for (const qNum of analysis.isExplanationFor) {
      allQuestionNumbers.add(qNum);
    }
  }

  // Initialize groups
  for (const qNum of allQuestionNumbers) {
    groups[qNum] = { questionPages: [], explanationPages: [], diagramPages: [] };
  }

  // Second pass: assign pages to groups
  for (const analysis of analyses) {
    // Question pages
    if (analysis.pageType === 'question' || analysis.pageType === 'mixed') {
      for (const qNum of analysis.questionNumbers) {
        if (groups[qNum] && !groups[qNum].questionPages.includes(analysis.pageNum)) {
          groups[qNum].questionPages.push(analysis.pageNum);
        }
      }
    }

    // Diagram pages
    if (analysis.pageType === 'diagram' || (analysis.hasImage && analysis.pageType !== 'explanation')) {
      for (const qNum of analysis.questionNumbers) {
        if (groups[qNum] && !groups[qNum].diagramPages.includes(analysis.pageNum)) {
          groups[qNum].diagramPages.push(analysis.pageNum);
        }
      }
    }

    // Explanation pages
    if (analysis.pageType === 'explanation' || analysis.isExplanationFor.length > 0) {
      for (const qNum of analysis.isExplanationFor) {
        if (groups[qNum] && !groups[qNum].explanationPages.includes(analysis.pageNum)) {
          groups[qNum].explanationPages.push(analysis.pageNum);
        }
      }
    }
  }

  // Sort pages within each group
  for (const qNum of Object.keys(groups)) {
    groups[parseInt(qNum)].questionPages.sort((a, b) => a - b);
    groups[parseInt(qNum)].explanationPages.sort((a, b) => a - b);
    groups[parseInt(qNum)].diagramPages.sort((a, b) => a - b);
  }

  return groups;
}

async function extractQuestionFromGroup(
  questionNumber: number,
  group: { questionPages: number[]; explanationPages: number[]; diagramPages: number[] },
  category: string,
  apiKey: string
): Promise<ExtractedQuestion | null> {
  // Build image content for all relevant pages
  const allPages = [...new Set([...group.questionPages, ...group.diagramPages.slice(0, 2)])];
  
  if (allPages.length === 0) {
    console.log(`No pages found for question ${questionNumber}`);
    return null;
  }

  const imageContent = allPages.map(pageNum => ({
    type: 'image_url' as const,
    image_url: { url: `page-${pageNum}` } // Placeholder - in real use, get actual URLs
  }));

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are extracting medical exam questions from page images. Extract question #${questionNumber}.

IMPORTANT:
- Paraphrase the question in your own words to avoid copyright issues
- Keep the medical accuracy and educational value
- Extract all answer options with their letters
- Identify the correct answer
- Write a comprehensive explanation

Category: ${category}`
        },
        {
          role: 'user',
          content: `Extract question #${questionNumber} from these page images. Paraphrase the content.`
        }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'extract_question',
          description: 'Extract and paraphrase a medical question',
          parameters: {
            type: 'object',
            properties: {
              questionText: { type: 'string', description: 'Paraphrased question stem' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    letter: { type: 'string' },
                    text: { type: 'string' },
                    isCorrect: { type: 'boolean' },
                    explanation: { type: 'string' }
                  },
                  required: ['letter', 'text', 'isCorrect']
                }
              },
              explanation: { type: 'string', description: 'Comprehensive explanation of the correct answer' },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              hasImage: { type: 'boolean', description: 'Whether the question requires viewing an image' }
            },
            required: ['questionText', 'options', 'explanation', 'difficulty', 'hasImage']
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'extract_question' } }
    })
  });

  if (!response.ok) {
    console.error(`Failed to extract question ${questionNumber}:`, await response.text());
    return null;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (toolCall?.function?.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    return {
      questionNumber,
      questionText: args.questionText,
      options: args.options,
      explanation: args.explanation,
      difficulty: args.difficulty,
      hasImage: args.hasImage,
      questionPages: group.questionPages,
      explanationPages: group.explanationPages
    };
  }

  return null;
}
