import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedQuestion {
  question_order: number;
  question_text: string;
  answer_choices: { choice_id: string; choice_text: string; is_correct: boolean }[];
  correct_answer_id: string;
  explanation_text: string;
  images: { source: string; position: string }[];
  validation: {
    text_complete: boolean;
    explanation_complete: boolean;
    images_attached: boolean;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, pdfId, subject, system } = await req.json();

    if (!pdfText) {
      return new Response(
        JSON.stringify({ error: "PDF text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STRICT EXTRACTION PROMPT - No hallucination, verbatim only
    const systemPrompt = `You are a STRICT content extraction engine. Your ONLY job is to extract questions VERBATIM from the provided PDF text.

CRITICAL RULES:
1. EXTRACT ONLY - Do not interpret, explain, or add any content
2. VERBATIM TEXT - Copy text exactly as it appears
3. NO HALLUCINATION - If content is missing, return "MISSING_FROM_PDF"
4. NO INFERENCE - Do not guess answers or explanations
5. PRESERVE FORMAT - Keep all formatting, line breaks, and structure

FORBIDDEN ACTIONS:
- Do not add medical knowledge
- Do not complete partial sentences
- Do not infer correct answers
- Do not generate explanations
- Do not use phrases like "likely", "typically", "suggests"

OUTPUT FORMAT (JSON):
{
  "questions": [
    {
      "question_order": 1,
      "question_text": "[EXACT question text from PDF]",
      "answer_choices": [
        { "choice_id": "A", "choice_text": "[EXACT option A text]", "is_correct": false },
        { "choice_id": "B", "choice_text": "[EXACT option B text]", "is_correct": true }
      ],
      "correct_answer_id": "B",
      "explanation_text": "[EXACT explanation from PDF or MISSING_FROM_PDF]",
      "images": [],
      "validation": {
        "text_complete": true,
        "explanation_complete": true,
        "images_attached": false
      }
    }
  ]
}

VALIDATION RULES:
- text_complete = true ONLY if question_text is NOT "MISSING_FROM_PDF" and length > 20
- explanation_complete = true ONLY if explanation_text is NOT "MISSING_FROM_PDF" and length > 20
- images_attached = false (images must be uploaded separately)

CORRECT ANSWER DETECTION:
- Look for markers: "Correct:", "Answer:", asterisk (*), bold, or explicit indication
- If no marker found, set is_correct to false for ALL options and correct_answer_id to "UNKNOWN"`;

    const userPrompt = `Extract ALL questions from this PDF text. Copy content EXACTLY as written. Do not add, infer, or modify anything.

PDF CONTENT:
${pdfText}

Extract each question with:
1. Complete question text (verbatim)
2. All answer choices (A, B, C, D, E, etc.) with exact text
3. Correct answer identification (from PDF markers only)
4. Full explanation (verbatim from PDF)

Return ONLY valid JSON matching the specified format.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY") || Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for deterministic extraction
        max_tokens: 16000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    const questions: ExtractedQuestion[] = parsedContent.questions || [];

    // Validate each question
    const validatedQuestions = questions.map((q, index) => ({
      ...q,
      question_order: index + 1,
      validation: {
        text_complete: q.question_text && q.question_text !== "MISSING_FROM_PDF" && q.question_text.length > 20,
        explanation_complete: q.explanation_text && q.explanation_text !== "MISSING_FROM_PDF" && q.explanation_text.length > 20,
        images_attached: false // Always false until manually uploaded
      }
    }));

    return new Response(
      JSON.stringify({
        questions: validatedQuestions,
        total: validatedQuestions.length,
        pdf_id: pdfId,
        subject,
        system
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Extraction error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
