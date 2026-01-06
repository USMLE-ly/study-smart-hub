import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/USMLE-ly/study-smart-hub/main/public/pdfs';

interface ExtractedQuestion {
  question_number: number;
  question_text: string;
  options: { letter: string; text: string; is_correct: boolean }[];
  explanation: string;
  choice_explanations?: { [key: string]: string };
  educational_objective?: string;
  has_image: boolean;
  image_description?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { pdfName, category, subject = 'Genetics', skipExisting = false } = body;

    if (!pdfName) {
      return new Response(
        JSON.stringify({ error: 'pdfName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PROCESS] Starting: ${pdfName}, category: ${category}`);

    // Check if already processed
    if (skipExisting) {
      const { data: existing } = await supabase
        .from('questions')
        .select('id')
        .eq('source_pdf', pdfName)
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, message: 'Already processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const pdfUrl = `${GITHUB_RAW_BASE}/${pdfName}`;
    console.log(`[AI] Asking AI to extract from URL: ${pdfUrl}`);

    // Use AI to extract questions - pass URL directly, let AI fetch it
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: `You are extracting USMLE-style questions from a PDF. The PDF is at: ${pdfUrl}

This is a ${category} PDF named "${pdfName}" for ${subject}.

Extract ALL questions from this PDF. For EACH question, capture:
1. Complete question text with the full clinical vignette
2. All answer options (A-E) with complete text
3. Which option is correct
4. The COMPLETE explanation - capture every word including:
   - Main concept explanation
   - Why the correct answer is right
   - Why each wrong answer is wrong (Choice A, Choice B, etc.)
   - Educational Objective
5. If there are images/diagrams, describe them in detail

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Full clinical vignette and question...",
      "options": [
        {"letter": "A", "text": "option text", "is_correct": false},
        {"letter": "B", "text": "option text", "is_correct": true},
        {"letter": "C", "text": "option text", "is_correct": false},
        {"letter": "D", "text": "option text", "is_correct": false},
        {"letter": "E", "text": "option text", "is_correct": false}
      ],
      "explanation": "COMPLETE explanation including: Main concept... Choice A is incorrect because... Choice B is correct because... Educational Objective: ...",
      "choice_explanations": {
        "A": "Why A is wrong...",
        "B": "Why B is correct...",
        "C": "Why C is wrong...",
        "D": "Why D is wrong...",
        "E": "Why E is wrong..."
      },
      "educational_objective": "The key learning point",
      "has_image": true,
      "image_description": "Detailed description of any image in the question or explanation"
    }
  ]
}

CRITICAL: Return ONLY the JSON, no markdown code blocks, no extra text.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI ERROR] ${response.status}: ${errText}`);
      throw new Error(`AI error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    console.log(`[AI] Response received, length: ${content.length}`);

    // Parse JSON
    let questions: ExtractedQuestion[] = [];
    try {
      let jsonStr = content;
      // Try to extract JSON from markdown if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      const directMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (directMatch) jsonStr = directMatch[0];
      const parsed = JSON.parse(jsonStr);
      questions = parsed.questions || [];
    } catch (e) {
      console.error('[PARSE ERROR]', e);
      console.log('[RAW CONTENT]', content.substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: content.substring(0, 300) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[EXTRACTED] ${questions.length} questions from ${pdfName}`);

    // Insert questions into database
    let inserted = 0;
    
    for (const q of questions) {
      if (!q.question_text || q.question_text.length < 20) continue;

      // Build comprehensive explanation
      let fullExplanation = q.explanation || '';
      
      if (q.choice_explanations && Object.keys(q.choice_explanations).length > 0) {
        fullExplanation += '\n\n';
        for (const [letter, explanation] of Object.entries(q.choice_explanations)) {
          if (explanation) {
            fullExplanation += `(Choice ${letter}) ${explanation}\n\n`;
          }
        }
      }
      
      if (q.educational_objective) {
        fullExplanation += `\nEducational Objective: ${q.educational_objective}`;
      }

      const { data: qData, error: qError } = await supabase
        .from('questions')
        .insert({
          question_text: q.question_text,
          subject: subject,
          system: 'General',
          category: category,
          explanation: fullExplanation,
          has_image: q.has_image || false,
          image_description: q.image_description || null,
          source_pdf: pdfName,
          difficulty: 'Medium'
        })
        .select('id')
        .single();

      if (qError) {
        console.error(`[DB ERROR] Question insert:`, qError.message);
        continue;
      }

      // Insert options
      if (q.options && q.options.length > 0) {
        const opts = q.options.map(o => ({
          question_id: qData.id,
          option_letter: o.letter,
          option_text: o.text,
          is_correct: o.is_correct || false,
          explanation: q.choice_explanations?.[o.letter] || null
        }));

        const { error: optErr } = await supabase.from('question_options').insert(opts);
        if (optErr) console.error(`[DB ERROR] Options:`, optErr.message);
      }

      inserted++;
    }

    console.log(`[COMPLETE] Inserted ${inserted}/${questions.length} questions for ${pdfName}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdfName,
        category,
        extracted: questions.length,
        inserted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ERROR]', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
