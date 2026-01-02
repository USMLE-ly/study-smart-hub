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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, subject, system } = await req.json();
    
    if (!pdfText || !subject || !system) {
      return new Response(
        JSON.stringify({ error: 'pdfText, subject, and system are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing PDF text for subject: ${subject}, system: ${system}`);
    console.log(`PDF text length: ${pdfText.length} characters`);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Clean the text - remove CamScanner and other artifacts
    const cleanedText = pdfText
      .replace(/CamScanner/gi, '')
      .replace(/CS\s*CamScanner/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const systemPrompt = `You are a medical question extraction expert. Extract ALL multiple-choice questions from the provided PDF text.

CRITICAL RULES:
1. Extract ONLY questions that are explicitly in the text - DO NOT create or invent questions
2. Each question must have the exact text from the PDF
3. Extract all answer options (A, B, C, D, E) exactly as written
4. Identify the correct answer ONLY from the text (look for "Answer:", "Correct:", "Ans:", or marked answers)
5. Extract any explanation provided for the correct answer
6. Remove any "CamScanner" watermark text
7. Categorize each question by its topic within ${subject}

Return a JSON array of questions in this exact format:
{
  "questions": [
    {
      "question_text": "The exact question text",
      "options": [
        {"letter": "A", "text": "Option A text", "is_correct": false},
        {"letter": "B", "text": "Option B text", "is_correct": true},
        {"letter": "C", "text": "Option C text", "is_correct": false},
        {"letter": "D", "text": "Option D text", "is_correct": false}
      ],
      "explanation": "Explanation from the PDF or empty string",
      "category": "Topic/category for this question"
    }
  ]
}

IMPORTANT: Only return valid JSON. No markdown, no extra text.`;

    const userPrompt = `Extract ALL questions from this ${subject} / ${system} PDF content:

${cleanedText}

Remember:
- Extract the EXACT question text as written
- Include ALL answer options with correct marking
- Only mark an answer correct if it's explicitly indicated in the text
- Include explanations if provided
- Return ONLY the JSON array, nothing else`;

    console.log('Calling AI to extract questions...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '';

    console.log('AI response received, parsing JSON...');

    // Parse the JSON response
    let questions: ParsedQuestion[] = [];
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      const parsed = JSON.parse(jsonStr);
      questions = parsed.questions || parsed;
      
      if (!Array.isArray(questions)) {
        questions = [questions];
      }

      console.log(`Successfully extracted ${questions.length} questions`);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content:', content.substring(0, 500));
      throw new Error('Failed to parse AI response as valid JSON');
    }

    // Validate and clean questions
    const validQuestions = questions.filter(q => {
      return q.question_text && 
             q.question_text.length > 10 &&
             Array.isArray(q.options) && 
             q.options.length >= 2 &&
             q.options.some(o => o.is_correct);
    }).map(q => ({
      ...q,
      question_text: q.question_text.replace(/CamScanner/gi, '').trim(),
      subject,
      system: q.category || system,
    }));

    console.log(`Returning ${validQuestions.length} valid questions`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        questions: validQuestions,
        totalExtracted: questions.length,
        validCount: validQuestions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse PDF questions';
    console.error('Error in parse-pdf-questions:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
