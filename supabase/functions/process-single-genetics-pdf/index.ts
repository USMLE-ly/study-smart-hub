import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/USMLE-ly/study-smart-hub/main/public/pdfs';

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

    // Fetch PDF from GitHub
    const pdfUrl = `${GITHUB_RAW_BASE}/${pdfName}`;
    console.log(`[FETCH] Downloading from: ${pdfUrl}`);
    
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      console.error(`[FETCH ERROR] ${pdfResponse.status}: ${pdfResponse.statusText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch PDF: ${pdfResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Convert to base64 using btoa approach
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    const pdfBase64 = btoa(binary);
    console.log(`[FETCH] Downloaded ${pdfBuffer.byteLength} bytes, base64 length: ${pdfBase64.length}`);

    // Limit base64 size to avoid memory issues (take first 500KB of base64)
    const truncatedBase64 = pdfBase64.substring(0, 500000);
    console.log(`[AI] Sending ${truncatedBase64.length} chars of base64 to AI...`);

    // Use AI to extract questions
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
            content: `You are a medical education expert. Extract USMLE-style questions from PDFs. For each question:
1. Extract the COMPLETE question text including the full clinical vignette
2. Extract ALL answer options (A through E) with the text
3. Identify which option is CORRECT
4. Extract the COMPLETE explanation
5. Extract the educational objective if present
6. Note if there are images/diagrams

Return ONLY valid JSON, no markdown code blocks.`
          },
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: `Extract ALL questions from this ${category} PDF named "${pdfName}". Return this exact JSON structure with NO markdown:
{"questions": [{"question_text": "full question here", "options": [{"letter": "A", "text": "option text", "is_correct": true}, {"letter": "B", "text": "...", "is_correct": false}, {"letter": "C", "text": "...", "is_correct": false}, {"letter": "D", "text": "...", "is_correct": false}, {"letter": "E", "text": "...", "is_correct": false}], "main_explanation": "full explanation", "educational_objective": "objective if any", "has_image": false, "image_description": ""}]}`
              },
              {
                type: 'image_url',
                image_url: { url: `data:application/pdf;base64,${truncatedBase64}` }
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
    console.log(`[AI] Response received, length: ${content.length}`);

    // Parse JSON from response
    let questions: ExtractedQuestion[] = [];
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      // Find JSON object
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

      const fullExplanation = [
        q.main_explanation || '',
        q.educational_objective ? `\n\nEducational Objective: ${q.educational_objective}` : ''
      ].join('');

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
          explanation: o.explanation || null
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
