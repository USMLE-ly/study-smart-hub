import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PageImage {
  pageNumber: number;
  imageUrl: string; // Storage URL of the page screenshot
}

interface ExtractedQuestion {
  questionNumber: number;
  questionPageNumbers: number[]; // Only pages with images/diagrams
  explanationPageNumbers: number[]; // 2-4 explanation pages
  questionText: string;
  options: {
    letter: string;
    text: string;
    isCorrect: boolean;
  }[];
  correctAnswer: string;
  difficulty: string;
  hasQuestionImage: boolean; // True if question has diagram/image
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LOVABLE_API_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { pageImages, pdfName, category, subject, system, batchSize = 15, model = "google/gemini-2.5-flash" } = await req.json();
    console.log("Using AI model:", model);

    if (!pageImages || !Array.isArray(pageImages) || pageImages.length === 0) {
      throw new Error("pageImages array is required");
    }

    console.log(`Processing ${pageImages.length} pages from ${pdfName} (batch size: ${batchSize})`);

    // Process pages in batches to avoid overwhelming the AI
    const effectiveBatchSize = Math.min(batchSize, pageImages.length);
    const batches: PageImage[][] = [];
    for (let i = 0; i < pageImages.length; i += effectiveBatchSize) {
      batches.push(pageImages.slice(i, i + effectiveBatchSize));
    }

    console.log(`Split into ${batches.length} batches`);

    // Build the prompt with all page image URLs
    const pageDescriptions = pageImages.map((p: PageImage) => 
      `Page ${p.pageNumber}: ${p.imageUrl}`
    ).join("\n");

const systemPrompt = `You are an expert medical education content extractor for USMLE-style question banks.

TASK: Extract ALL questions from the PDF pages. Each question typically has:
- 1 page with the question (clinical vignette + image/diagram + choices A-E)
- 2-4 explanation pages (diagrams, explanation text, educational objective)

FOR EACH QUESTION, identify:
1. questionPageNumbers: Page(s) with the question - ONLY include if page has a diagram/image
2. explanationPageNumbers: All explanation pages (2-4 pages with diagrams, explanations)
3. questionText: The full clinical vignette and question
4. options: All 5 choices A-E with text and which is correct
5. correctAnswer: The correct letter
6. difficulty: easy/medium/hard
7. hasQuestionImage: true if question page has a clinical image or diagram

CRITICAL RULES:
- For questionPageNumbers: ONLY include the page if it has an IMAGE or DIAGRAM (not just text)
- If a question page is text-only with no image, set questionPageNumbers to empty array []
- This avoids duplicate text since we already extract questionText
- Explanation pages should capture all visual content (diagrams, tables, flowcharts)
- Each question's explanation immediately follows its question page`;

const userPrompt = `Extract all questions from these PDF pages.

PDF: ${pdfName}
Category: ${category}
Subject: ${subject}

Page URLs:
${pageDescriptions}

RULES FOR questionPageNumbers:
- ONLY include page numbers that have IMAGES or DIAGRAMS
- If question page is text-only (no image), use empty array: []
- This prevents text duplication since we store questionText separately`;

    // JSON Schema for structured output - guarantees valid JSON
    const questionsSchema = {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            required: ["questionNumber", "questionPageNumbers", "explanationPageNumbers", "questionText", "options", "correctAnswer", "difficulty", "hasQuestionImage"],
            properties: {
              questionNumber: { type: "number" },
              questionPageNumbers: { type: "array", items: { type: "number" } },
              explanationPageNumbers: { type: "array", items: { type: "number" } },
              questionText: { type: "string" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  required: ["letter", "text", "isCorrect"],
                  properties: {
                    letter: { type: "string" },
                    text: { type: "string" },
                    isCorrect: { type: "boolean" }
                  },
                  additionalProperties: false
                }
              },
              correctAnswer: { type: "string" },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
              hasQuestionImage: { type: "boolean" }
            },
            additionalProperties: false
          }
        }
      },
      required: ["questions"],
      additionalProperties: false
    };

    // Retry logic with exponential backoff for transient errors
    const maxRetries = 3;
    let lastError: Error | null = null;
    let aiData: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AI API attempt ${attempt}/${maxRetries}`);
        
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { 
                role: "user", 
                content: [
                  { type: "text", text: userPrompt },
                  ...pageImages.map((p: PageImage) => ({
                    type: "image_url",
                    image_url: { url: p.imageUrl }
                  }))
                ]
              }
            ],
            max_tokens: 8000,
            // Use tool calling for guaranteed structured JSON output
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_questions",
                  description: "Extract all questions from the PDF pages with their options and metadata",
                  parameters: questionsSchema
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "extract_questions" } }
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API error (attempt ${attempt}):`, aiResponse.status, errorText.substring(0, 200));
          
          // Retry on 503 (service unavailable) or 429 (rate limit)
          if ((aiResponse.status === 503 || aiResponse.status === 429) && attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        aiData = await aiResponse.json();
        break; // Success, exit retry loop
        
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 2000;
          console.log(`Error, waiting ${waitTime}ms before retry: ${lastError.message}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    if (!aiData) {
      throw lastError || new Error("AI API failed after all retries");
    }

    // Extract structured output from tool call response
    console.log("AI Response received, parsing tool call... [v3-structured-output]");
    
    let parsedQuestions: { questions: ExtractedQuestion[] };
    try {
      const message = aiData.choices?.[0]?.message;
      
      // Check for tool call response (structured output)
      if (message?.tool_calls?.[0]?.function?.arguments) {
        const args = message.tool_calls[0].function.arguments;
        console.log("Got tool call response, parsing arguments...");
        parsedQuestions = typeof args === 'string' ? JSON.parse(args) : args;
      } 
      // Fallback: check for regular content (shouldn't happen with tool_choice)
      else if (message?.content) {
        console.log("Fallback: parsing content (no tool call)");
        const content = message.content.trim();
        
        // Strip markdown fences if present
        let cleanedContent = content
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        
        // Check for truncation
        if (!cleanedContent.endsWith("}")) {
          throw new Error("AI response was truncated - incomplete JSON");
        }
        
        parsedQuestions = JSON.parse(cleanedContent);
      } else {
        console.error("Unexpected AI response structure:", JSON.stringify(aiData).substring(0, 500));
        throw new Error("No tool call or content in AI response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      console.error("AI response structure:", JSON.stringify(aiData).substring(0, 1000));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to parse AI response: ${parseError}`,
          rawAiResponse: JSON.stringify(aiData).substring(0, 5000),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const questions = parsedQuestions.questions || [];
    console.log(`Extracted ${questions.length} questions`);

    // Insert questions into database
    const insertedQuestions = [];

    for (const q of questions) {
      // Insert question
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .insert({
          question_text: q.questionText,
          subject: subject || "Genetics",
          system: system || "General",
          category: category,
          difficulty: q.difficulty || "medium",
          source_pdf: pdfName,
          has_image: q.hasQuestionImage || q.questionPageNumbers.length > 0,
        })
        .select()
        .single();

      if (questionError) {
        console.error("Error inserting question:", questionError);
        continue;
      }

      const questionId = questionData.id;

      // Insert options
      for (const opt of q.options) {
        await supabase.from("question_options").insert({
          question_id: questionId,
          option_letter: opt.letter,
          option_text: opt.text,
          is_correct: opt.isCorrect,
        });
      }

      // Insert question page images
      for (let i = 0; i < q.questionPageNumbers.length; i++) {
        const pageNum = q.questionPageNumbers[i];
        const pageImg = pageImages.find((p: PageImage) => p.pageNumber === pageNum);
        if (pageImg) {
          await supabase.from("question_images").insert({
            question_id: questionId,
            source_type: "question",
            position: "question",
            image_order: i,
            file_path: `${pdfName}/page-${pageNum}.png`,
            storage_url: pageImg.imageUrl,
          });
        }
      }

      // Insert explanation page images
      for (let i = 0; i < q.explanationPageNumbers.length; i++) {
        const pageNum = q.explanationPageNumbers[i];
        const pageImg = pageImages.find((p: PageImage) => p.pageNumber === pageNum);
        if (pageImg) {
          await supabase.from("question_images").insert({
            question_id: questionId,
            source_type: `explanation_${i + 1}`,
            position: "explanation",
            image_order: i,
            file_path: `${pdfName}/page-${pageNum}.png`,
            storage_url: pageImg.imageUrl,
          });
        }
      }

      insertedQuestions.push({
        id: questionId,
        questionNumber: q.questionNumber,
        questionPages: q.questionPageNumbers,
        explanationPages: q.explanationPageNumbers,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        pdfName,
        totalPages: pageImages.length,
        questionsExtracted: questions.length,
        questionsInserted: insertedQuestions.length,
        questions: insertedQuestions,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in extract-questions-from-pages:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
