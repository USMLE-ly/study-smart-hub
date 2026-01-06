import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Categories based on PDF naming convention
const CATEGORY_MAP: Record<string, string> = {
  'genetics-1': 'DNA Structure, Replication and Repair',
  'genetics-2': 'DNA Structure, Synthesis and Processing',
  'genetics-3': 'Gene Expression and Regulation',
  'genetics-4': 'Gene Expression and Regulation',
  'genetics-5': 'Clinical Genetics',
  'genetics-6': 'Clinical Genetics',
  'genetics-7': 'Clinical Genetics',
  'genetics-8': 'Miscellaneous',
};

interface ExtractedQuestion {
  question_text: string;
  options: { letter: string; text: string; is_correct: boolean; explanation?: string }[];
  main_explanation: string;
  educational_objective: string;
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
    const { pdfName, pdfBase64, skipExisting = false } = body;

    if (!pdfName) {
      return new Response(
        JSON.stringify({ error: 'pdfName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PROCESS] Starting: ${pdfName}`);

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

    // Determine category from PDF name
    const pdfPrefix = pdfName.replace(/-\d+\.pdf$/, '');
    const category = CATEGORY_MAP[pdfPrefix] || 'Genetics';
    console.log(`[CATEGORY] ${pdfPrefix} -> ${category}`);

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'pdfBase64 data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to extract questions - send smaller chunks to avoid memory issues
    // We'll send just a description request first, then individual question extraction
    console.log(`[AI] Analyzing PDF structure...`);
    
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
            content: `Extract USMLE-style medical questions from PDFs. For each question extract:
1. Full question text including clinical vignette
2. All answer options (A-E) with correct answer marked
3. Complete explanation
4. Educational objective
5. Whether there's an image/diagram

Return as JSON array of questions.`
          },
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: `Extract ALL questions from this ${category} genetics PDF (${pdfName}). Return valid JSON with structure:
{
  "questions": [
    {
      "question_text": "...",
      "options": [{"letter": "A", "text": "...", "is_correct": false}, ...],
      "main_explanation": "...",
      "educational_objective": "...",
      "has_image": false,
      "image_description": ""
    }
  ]
}`
              },
              {
                type: 'image_url',
                image_url: { url: `data:application/pdf;base64,${pdfBase64.substring(0, 500000)}` }
              }
            ]
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
    console.log(`[AI] Response received, parsing...`);

    // Parse JSON from response
    let questions: ExtractedQuestion[] = [];
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      const directMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (directMatch) jsonStr = directMatch[0];
      const parsed = JSON.parse(jsonStr);
      questions = parsed.questions || [];
    } catch (e) {
      console.error('[PARSE ERROR]', e);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: content.substring(0, 1000) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[EXTRACTED] ${questions.length} questions`);

    // Insert questions into database
    let inserted = 0;
    for (const q of questions) {
      if (!q.question_text || q.question_text.length < 20) continue;

      const fullExplanation = [
        q.main_explanation || '',
        q.educational_objective ? `\n\nEducational Objective: ${q.educational_objective}` : ''
      ].join('');

      const { data: qData, error: qError } = await supabase
        .from('questions')
        .insert({
          question_text: q.question_text,
          subject: 'Genetics',
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
          explanation: o.explanation || null
        }));

        const { error: optErr } = await supabase.from('question_options').insert(opts);
        if (optErr) console.error(`[DB ERROR] Options:`, optErr.message);
      }

      inserted++;
    }

    console.log(`[COMPLETE] Inserted ${inserted}/${questions.length} questions`);

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
