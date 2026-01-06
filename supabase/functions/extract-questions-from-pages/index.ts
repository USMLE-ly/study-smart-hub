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
  questionPageNumbers: number[];
  explanationPageNumbers: number[];
  questionText: string;
  options: {
    letter: string;
    text: string;
    isCorrect: boolean;
  }[];
  correctAnswer: string;
  difficulty: string;
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

    const { pageImages, pdfName, category, subject, system } = await req.json();

    if (!pageImages || !Array.isArray(pageImages) || pageImages.length === 0) {
      throw new Error("pageImages array is required");
    }

    console.log(`Processing ${pageImages.length} pages from ${pdfName}`);

    // Build the prompt with all page image URLs
    const pageDescriptions = pageImages.map((p: PageImage) => 
      `Page ${p.pageNumber}: ${p.imageUrl}`
    ).join("\n");

    const systemPrompt = `You are an expert medical education content extractor. You analyze USMLE-style question bank pages.

Your task is to extract ALL questions from the provided PDF pages. Each question typically spans:
- 1 page for the question (with clinical vignette, image if any, and answer choices A-E)
- 2-4 pages for the explanation (labeled diagrams, explanation text, choice explanations, educational objective)

For each question, identify:
1. Which page number(s) contain the question
2. Which page number(s) contain the explanation
3. The full question text
4. All 5 answer options (A-E) with their text
5. The correct answer letter
6. Difficulty level (easy, medium, hard)

IMPORTANT: 
- Questions are numbered (1, 2, 3, etc.)
- Each question's explanation immediately follows its question
- The explanation pages contain diagrams, text explanations, and "Educational Objective" sections`;

    const userPrompt = `Extract all questions from these PDF pages.

PDF: ${pdfName}
Category: ${category}
Subject: ${subject}

Page URLs:
${pageDescriptions}

Return a JSON array of questions with this exact structure:
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
      "difficulty": "medium"
    }
  ]
}

ONLY return the JSON, no other text.`;

    // Call Lovable AI with all page images
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response received, parsing...");

    // Parse the JSON response
    let parsedQuestions: { questions: ExtractedQuestion[] };
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedQuestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      console.error("Raw content:", content.substring(0, 500));
      throw new Error(`Failed to parse AI response: ${parseError}`);
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
          has_image: true,
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
