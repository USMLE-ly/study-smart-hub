import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface PageImage {
  pageNum: number;
  url: string;
}

interface PageAnalysis {
  pageNum: number;
  pageType: 'question' | 'explanation' | 'diagram' | 'mixed';
  hasImage: boolean;
  imageType: 'clinical' | 'diagram' | 'chart' | 'microscopy' | 'none';
  questionNumbers: number[];
  isExplanationFor: number[];
  isExplanationDiagram: boolean;
  confidence: number;
}

interface ExtractedQuestion {
  questionNumber: number;
  questionText: string;
  options: { letter: string; text: string; isCorrect: boolean; explanation?: string }[];
  explanation: string;
  difficulty: string;
  hasImage: boolean;
  questionPageUrl: string;
  questionDiagramUrl?: string;
  explanationDiagramUrl?: string;
  explanationTextUrls: string[];
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

    // Step 1: Analyze ALL pages to classify them
    console.log("Step 1: Analyzing pages...");
    const pageAnalyses = await analyzePages(pageImages, LOVABLE_API_KEY);
    console.log("Page analyses complete:", pageAnalyses.length, "pages analyzed");

    // Step 2: Group pages by question
    console.log("Step 2: Grouping pages by question...");
    const questionGroups = groupPagesByQuestion(pageAnalyses, pageImages);
    const questionNumbers = Object.keys(questionGroups).map(Number).sort((a, b) => a - b);
    console.log(`Found ${questionNumbers.length} questions:`, questionNumbers);

    // Step 3: Extract questions from each group
    console.log("Step 3: Extracting questions...");
    const extractedQuestions: ExtractedQuestion[] = [];
    
    for (const qNum of questionNumbers) {
      const group = questionGroups[qNum];
      console.log(`Extracting question ${qNum}: questionPages=${group.questionPages}, explanationTextPages=${group.explanationTextPages}, explanationDiagramPages=${group.explanationDiagramPages}`);
      
      try {
        const extracted = await extractQuestionFromGroup(
          qNum,
          group,
          pageImages, // Pass actual page images with URLs!
          category,
          LOVABLE_API_KEY
        );
        if (extracted) {
          extractedQuestions.push(extracted);
          console.log(`✓ Question ${qNum} extracted successfully`);
        }
      } catch (error) {
        console.error(`Failed to extract question ${qNum}:`, error);
      }
    }

    console.log(`Extracted ${extractedQuestions.length} questions total`);

    // Step 4: Save questions to database
    console.log("Step 4: Saving to database...");
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
            source_page: question.questionNumber,
            has_image: question.hasImage
          })
          .select()
          .single();

        if (qError) {
          console.error('Failed to insert question:', qError);
          continue;
        }

        console.log(`Saved question ${question.questionNumber} with ID ${qData.id}`);

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

        // Link question screenshot
        if (question.questionPageUrl) {
          await supabase
            .from('question_images')
            .insert({
              question_id: qData.id,
              file_path: question.questionPageUrl,
              storage_url: question.questionPageUrl,
              source_type: 'question',
              position: 'question',
              image_order: 0
            });
          console.log(`  Linked question screenshot`);
        }

        // Link question diagram (if has image)
        if (question.questionDiagramUrl) {
          await supabase
            .from('question_images')
            .insert({
              question_id: qData.id,
              file_path: question.questionDiagramUrl,
              storage_url: question.questionDiagramUrl,
              source_type: 'question_diagram',
              position: 'question',
              image_order: 1
            });
          console.log(`  Linked question diagram`);
        }

        // Link explanation diagram (1 image)
        if (question.explanationDiagramUrl) {
          await supabase
            .from('question_images')
            .insert({
              question_id: qData.id,
              file_path: question.explanationDiagramUrl,
              storage_url: question.explanationDiagramUrl,
              source_type: 'explanation_diagram',
              position: 'explanation',
              image_order: 0
            });
          console.log(`  Linked explanation diagram`);
        }

        // Link explanation text screenshots (up to 3)
        for (let i = 0; i < question.explanationTextUrls.length; i++) {
          await supabase
            .from('question_images')
            .insert({
              question_id: qData.id,
              file_path: question.explanationTextUrls[i],
              storage_url: question.explanationTextUrls[i],
              source_type: 'explanation_text',
              position: 'explanation',
              image_order: i + 1
            });
        }
        console.log(`  Linked ${question.explanationTextUrls.length} explanation text screenshots`);

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

    const summary = `Successfully extracted ${savedCount} questions from ${pdfName}. Each question has linked screenshots for the question stem and 1-4 explanation images.`;
    console.log(summary);

    return new Response(
      JSON.stringify({
        success: true,
        questionsExtracted: savedCount,
        totalAnalyzed: extractedQuestions.length,
        summary
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
    console.log(`Analyzing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pageImages.length / BATCH_SIZE)}`);
    
    const batchPromises = batch.map(async (page) => {
      try {
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
                content: `You are a page classifier for medical education PDFs (like UWorld questions).

Classify each page as:
- "question": Contains a question stem with answer choices (A, B, C, D, E)
- "explanation": Contains the answer explanation (usually after showing the correct answer)
- "diagram": Contains primarily an educational diagram/image (charts, medical illustrations, histology)
- "mixed": Contains both question and explanation

Look for:
- Question numbers (e.g., "Question 1", "Q1", "1." at the start)
- Answer explanations often have "Educational Objective:", "Explanation:", or show the correct answer highlighted
- Diagrams in explanations are often labeled educational figures

Return structured data for each page.`
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Analyze page ${page.pageNum}:` },
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
                    hasImage: { type: 'boolean', description: 'Does this page contain a medical image, diagram, or chart?' },
                    imageType: { type: 'string', enum: ['clinical', 'diagram', 'chart', 'microscopy', 'none'] },
                    questionNumbers: { 
                      type: 'array', 
                      items: { type: 'number' },
                      description: 'Question numbers visible on this page (e.g., [1] if this is Question 1)'
                    },
                    isExplanationFor: { 
                      type: 'array', 
                      items: { type: 'number' },
                      description: 'Which question number(s) this page explains'
                    },
                    isExplanationDiagram: {
                      type: 'boolean',
                      description: 'Is this an educational diagram within an explanation (not question diagram)?'
                    },
                    confidence: { type: 'number', description: '0-1 confidence score' }
                  },
                  required: ['pageType', 'hasImage', 'imageType', 'questionNumbers', 'isExplanationFor', 'isExplanationDiagram', 'confidence']
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'classify_page' } }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to analyze page ${page.pageNum}:`, errorText);
          return createDefaultAnalysis(page.pageNum);
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        
        if (toolCall?.function?.arguments) {
          const args = JSON.parse(toolCall.function.arguments);
          return {
            pageNum: page.pageNum,
            pageType: args.pageType || 'mixed',
            hasImage: args.hasImage || false,
            imageType: args.imageType || 'none',
            questionNumbers: args.questionNumbers || [],
            isExplanationFor: args.isExplanationFor || [],
            isExplanationDiagram: args.isExplanationDiagram || false,
            confidence: args.confidence || 0.5
          };
        }

        return createDefaultAnalysis(page.pageNum);
      } catch (error) {
        console.error(`Error analyzing page ${page.pageNum}:`, error);
        return createDefaultAnalysis(page.pageNum);
      }
    });

    const batchResults = await Promise.all(batchPromises);
    analyses.push(...batchResults);
    
    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < pageImages.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return analyses;
}

function createDefaultAnalysis(pageNum: number): PageAnalysis {
  return {
    pageNum,
    pageType: 'mixed',
    hasImage: false,
    imageType: 'none',
    questionNumbers: [],
    isExplanationFor: [],
    isExplanationDiagram: false,
    confidence: 0
  };
}

interface QuestionGroup {
  questionPages: number[];
  questionDiagramPages: number[];
  explanationDiagramPages: number[];
  explanationTextPages: number[];
}

function groupPagesByQuestion(
  analyses: PageAnalysis[],
  pageImages: PageImage[]
): Record<number, QuestionGroup> {
  const groups: Record<number, QuestionGroup> = {};

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
    groups[qNum] = { 
      questionPages: [], 
      questionDiagramPages: [],
      explanationDiagramPages: [], 
      explanationTextPages: [] 
    };
  }

  // Second pass: assign pages to groups
  for (const analysis of analyses) {
    // Question pages (containing question stem)
    if (analysis.pageType === 'question' || analysis.pageType === 'mixed') {
      for (const qNum of analysis.questionNumbers) {
        if (groups[qNum]) {
          if (!groups[qNum].questionPages.includes(analysis.pageNum)) {
            groups[qNum].questionPages.push(analysis.pageNum);
          }
          // If question has image, add to questionDiagramPages
          if (analysis.hasImage && analysis.imageType !== 'none') {
            if (!groups[qNum].questionDiagramPages.includes(analysis.pageNum)) {
              groups[qNum].questionDiagramPages.push(analysis.pageNum);
            }
          }
        }
      }
    }

    // Explanation pages
    if (analysis.pageType === 'explanation' || analysis.isExplanationFor.length > 0) {
      for (const qNum of analysis.isExplanationFor) {
        if (groups[qNum]) {
          // Explanation diagram pages (educational images)
          if (analysis.isExplanationDiagram || (analysis.hasImage && analysis.imageType !== 'none')) {
            if (!groups[qNum].explanationDiagramPages.includes(analysis.pageNum)) {
              groups[qNum].explanationDiagramPages.push(analysis.pageNum);
            }
          } else {
            // Text explanation pages
            if (!groups[qNum].explanationTextPages.includes(analysis.pageNum)) {
              groups[qNum].explanationTextPages.push(analysis.pageNum);
            }
          }
        }
      }
    }

    // Diagram pages linked to questions
    if (analysis.pageType === 'diagram') {
      for (const qNum of analysis.questionNumbers) {
        if (groups[qNum] && !groups[qNum].questionDiagramPages.includes(analysis.pageNum)) {
          groups[qNum].questionDiagramPages.push(analysis.pageNum);
        }
      }
    }
  }

  // Sort pages within each group
  for (const qNum of Object.keys(groups)) {
    const g = groups[parseInt(qNum)];
    g.questionPages.sort((a, b) => a - b);
    g.questionDiagramPages.sort((a, b) => a - b);
    g.explanationDiagramPages.sort((a, b) => a - b);
    g.explanationTextPages.sort((a, b) => a - b);
  }

  return groups;
}

function getPageUrl(pageNum: number, pageImages: PageImage[]): string | undefined {
  return pageImages.find(p => p.pageNum === pageNum)?.url;
}

async function extractQuestionFromGroup(
  questionNumber: number,
  group: QuestionGroup,
  pageImages: PageImage[],
  category: string,
  apiKey: string
): Promise<ExtractedQuestion | null> {
  // Get the actual URLs for all pages
  const questionPageUrl = getPageUrl(group.questionPages[0], pageImages);
  const questionDiagramUrl = group.questionDiagramPages.length > 0 
    ? getPageUrl(group.questionDiagramPages[0], pageImages) 
    : undefined;
  
  // Select 1 explanation diagram + up to 3 text explanation screenshots
  const explanationDiagramUrl = group.explanationDiagramPages.length > 0
    ? getPageUrl(group.explanationDiagramPages[0], pageImages)
    : undefined;
  
  const explanationTextUrls = group.explanationTextPages
    .slice(0, 3)
    .map(p => getPageUrl(p, pageImages))
    .filter((url): url is string => !!url);

  if (!questionPageUrl) {
    console.log(`No question page URL found for question ${questionNumber}`);
    return null;
  }

  // Build image content for AI extraction - use ACTUAL URLs
  const imagesToAnalyze: { type: 'image_url'; image_url: { url: string } }[] = [
    { type: 'image_url', image_url: { url: questionPageUrl } }
  ];

  if (questionDiagramUrl && questionDiagramUrl !== questionPageUrl) {
    imagesToAnalyze.push({ type: 'image_url', image_url: { url: questionDiagramUrl } });
  }

  // Add explanation pages for extracting the explanation text
  if (explanationDiagramUrl) {
    imagesToAnalyze.push({ type: 'image_url', image_url: { url: explanationDiagramUrl } });
  }
  
  for (const url of explanationTextUrls.slice(0, 2)) { // Limit to avoid token overflow
    imagesToAnalyze.push({ type: 'image_url', image_url: { url } });
  }

  console.log(`Sending ${imagesToAnalyze.length} images to AI for question ${questionNumber}`);

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
          content: `You are extracting a medical exam question (like UWorld style). Extract question #${questionNumber}.

INSTRUCTIONS:
1. Read the question stem carefully from the question page image
2. PARAPHRASE the question in your own words (rewrite it, don't copy verbatim)
3. Extract all answer options (A through E typically)
4. Identify which answer is CORRECT
5. Read the explanation pages and write a comprehensive explanation of WHY the correct answer is right
6. For each INCORRECT option, briefly explain why it's wrong

The question should be medically accurate but rephrased to avoid copyright.

Category: ${category}`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Extract question #${questionNumber}. The first image is the question page. Other images are explanation pages.` },
            ...imagesToAnalyze
          ]
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
              questionText: { 
                type: 'string', 
                description: 'Paraphrased question stem (clinical vignette + actual question)' 
              },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    letter: { type: 'string', description: 'A, B, C, D, or E' },
                    text: { type: 'string', description: 'Option text (paraphrased)' },
                    isCorrect: { type: 'boolean' },
                    explanation: { type: 'string', description: 'Why this option is right or wrong' }
                  },
                  required: ['letter', 'text', 'isCorrect']
                }
              },
              explanation: { 
                type: 'string', 
                description: 'Comprehensive explanation of the correct answer and key concepts' 
              },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              hasImage: { 
                type: 'boolean', 
                description: 'Does the question require viewing an image/diagram to answer?' 
              }
            },
            required: ['questionText', 'options', 'explanation', 'difficulty', 'hasImage']
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'extract_question' } }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to extract question ${questionNumber}:`, errorText);
    return null;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (toolCall?.function?.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    return {
      questionNumber,
      questionText: args.questionText,
      options: args.options || [],
      explanation: args.explanation,
      difficulty: args.difficulty || 'medium',
      hasImage: args.hasImage || false,
      questionPageUrl,
      questionDiagramUrl,
      explanationDiagramUrl,
      explanationTextUrls
    };
  }

  return null;
}
