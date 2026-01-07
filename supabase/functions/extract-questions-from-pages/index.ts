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

Return JSON with this structure:
{
  "questions": [
    {
      "questionNumber": 1,
      "questionPageNumbers": [1],
      "explanationPageNumbers": [2, 3, 4],
      "questionText": "A 45-year-old woman presents with...",
      "options": [
        {"letter": "A", "text": "Option A text", "isCorrect": false},
        {"letter": "B", "text": "Option B text", "isCorrect": true},
        {"letter": "C", "text": "Option C text", "isCorrect": false},
        {"letter": "D", "text": "Option D text", "isCorrect": false},
        {"letter": "E", "text": "Option E text", "isCorrect": false}
      ],
      "correctAnswer": "B",
      "difficulty": "medium",
      "hasQuestionImage": true
    }
  ]
}

RULES FOR questionPageNumbers:
- ONLY include page numbers that have IMAGES or DIAGRAMS
- If question page is text-only (no image), use empty array: "questionPageNumbers": []
- This prevents text duplication since we store questionText separately

STRICT JSON OUTPUT:
- Use DOUBLE QUOTES for all keys and string values
- Do NOT use backticks, single quotes, comments, or trailing commas

ONLY return JSON, no other text.`;

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

    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response received, parsing... [v2-markdown-fix]");

    // Parse the JSON response
    let parsedQuestions: { questions: ExtractedQuestion[] };
    try {
      // First strip markdown code blocks if present (handles ```json ... ``` wrapping)
      let cleanedContent = content.trim();
      
      // Remove BOM and invisible Unicode characters FIRST
      cleanedContent = cleanedContent
        .replace(/^\uFEFF/, '')                              // BOM
        .replace(/[\u200B-\u200D\uFEFF]/g, '')               // Zero-width chars
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // Control chars
        .replace(/\r\n/g, '\n')                              // Normalize line endings
        .replace(/\r/g, '\n');
      
      console.log("Content starts with:", cleanedContent.substring(0, 20));
      
      // Handle ```json ... ``` wrapper (greedy match for content)
      const codeBlockMatch = cleanedContent.match(/^```(?:json)?\s*\n([\s\S]+)\n?```\s*$/);
      if (codeBlockMatch) {
        cleanedContent = codeBlockMatch[1].trim();
        console.log("Stripped markdown code block wrapper");
      } else if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
        if (cleanedContent.endsWith('```')) {
          cleanedContent = cleanedContent.slice(0, -3);
        }
        cleanedContent = cleanedContent.trim();
        console.log("Stripped ```json prefix");
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
        if (cleanedContent.endsWith('```')) {
          cleanedContent = cleanedContent.slice(0, -3);
        }
        cleanedContent = cleanedContent.trim();
        console.log("Stripped ``` prefix");
      }
      
      // Also try without newline requirement (for single-line responses)
      if (cleanedContent.startsWith('```')) {
        const singleLineMatch = cleanedContent.match(/^```(?:json)?\s*([\s\S]+?)```\s*$/);
        if (singleLineMatch) {
          cleanedContent = singleLineMatch[1].trim();
          console.log("Stripped single-line markdown wrapper");
        }
      }
      
      // Log char codes for debugging invisible characters
      console.log("First 10 char codes:", [...cleanedContent.slice(0, 10)].map(c => c.charCodeAt(0)));
      console.log("Cleaned content starts with:", cleanedContent.substring(0, 50));
      
      // Try to extract JSON from the response
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      // Sanitize JSON string to fix common escape issues
      let jsonStr = jsonMatch[0];
      // Fix invalid escape sequences by replacing them
      jsonStr = jsonStr
        .replace(/\\(?!["\\/bfnrtu])/g, "\\\\") // Escape backslashes not followed by valid escape chars
        .replace(/[\x00-\x1F\x7F]/g, (char: string) => {
          // Replace control characters with their escaped equivalents
          const code = char.charCodeAt(0);
          if (code === 0x09) return "\\t";
          if (code === 0x0A) return "\\n";
          if (code === 0x0D) return "\\r";
          return ""; // Remove other control characters
        });

      const parseJsonWithFixes = (input: string) => {
        try {
          return JSON.parse(input);
        } catch (_e1) {
          let fixed = input.trim().replace(/^\uFEFF/, "");

          // Some models occasionally wrap JSON in double braces
          if (fixed.startsWith("{{") && fixed.endsWith("}}")) {
            fixed = fixed.slice(1, -1);
          }

          fixed = fixed
            // Curly quotes → straight quotes (breaks JSON if used for keys)
            .replace(/[“”]/g, '"')
            // Backtick/single-quote keys → JSON keys
            .replace(/`([^`]+)`\s*:/g, '"$1":')
            .replace(/'([^']+)'\s*:/g, '"$1":')
            // Quote unquoted keys (JSON5-style)
            .replace(/([\{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
            // Remove trailing commas
            .replace(/,\s*([\}\]])/g, '$1');

          console.log("JSON parse retry; starts with:", JSON.stringify(fixed.slice(0, 30)));
          return JSON.parse(fixed);
        }
      };

      parsedQuestions = parseJsonWithFixes(jsonStr);
    } catch (parseError) {
      console.error("Parse error:", parseError);
      console.error("Raw content (first 1000 chars):", content.substring(0, 1000));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to parse AI response: ${parseError}`,
          rawAiResponse: content.substring(0, 5000), // Return raw response for debugging
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
