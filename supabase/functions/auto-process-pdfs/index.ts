import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENETICS_PDFS = [
  'genetics-1-5.pdf',
  'genetics-1-8.pdf',
  'genetics-2-6.pdf',
  'genetics-3-6.pdf',
  'genetics-3-8.pdf',
  'genetics-4-6.pdf',
  'genetics-5-7.pdf',
  'genetics-6-7.pdf',
  'genetics-7-5.pdf',
  'genetics-8-5.pdf'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const apiKey = Deno.env.get('LOVABLE_API_KEY');

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { category = 'genetics', startFrom = 0 } = body;

    const pdfs = category === 'genetics' ? GENETICS_PDFS : GENETICS_PDFS;
    const results: any[] = [];
    let totalQuestionsInserted = 0;

    console.log(`[AUTO-PROCESS] Starting processing of ${pdfs.length} PDFs from index ${startFrom}`);

    for (let i = startFrom; i < pdfs.length; i++) {
      const pdfName = pdfs[i];
      console.log(`\n[PDF ${i + 1}/${pdfs.length}] Processing: ${pdfName}`);

      try {
        // Fetch PDF from GitHub raw content
        const pdfUrl = `https://raw.githubusercontent.com/USMLE-ly/study-smart-hub/main/public/pdfs/${pdfName}`;
        console.log(`Fetching PDF from: ${pdfUrl}`);
        
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
          console.error(`Failed to fetch ${pdfName}: ${pdfResponse.status}`);
          results.push({ pdf: pdfName, status: 'fetch_failed', error: `HTTP ${pdfResponse.status}` });
          continue;
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
        console.log(`PDF size: ${pdfBuffer.byteLength} bytes`);

        // Extract questions using AI
        const extractedQuestions = await extractQuestions(pdfBase64, pdfName, apiKey);
        
        if (!extractedQuestions || extractedQuestions.length === 0) {
          console.log(`No questions extracted from ${pdfName}`);
          results.push({ pdf: pdfName, status: 'no_questions', count: 0 });
          continue;
        }

        console.log(`Extracted ${extractedQuestions.length} questions from ${pdfName}`);

        // Insert questions into database
        let insertedCount = 0;
        for (const q of extractedQuestions) {
          try {
            // Insert question
            const { data: questionData, error: questionError } = await supabase
              .from('questions')
              .insert({
                question_text: q.question_text,
                subject: 'Genetics',
                system: 'General',
                explanation: q.explanation,
                category: q.category || 'Genetics',
                has_image: q.has_image || false,
                image_description: q.image_description || null,
                source_pdf: pdfName,
                difficulty: 'Medium'
              })
              .select('id')
              .single();

            if (questionError) {
              console.error(`Error inserting question: ${questionError.message}`);
              continue;
            }

            const questionId = questionData.id;

            // Insert options
            if (q.options && q.options.length > 0) {
              const optionsToInsert = q.options.map((opt: any) => ({
                question_id: questionId,
                option_letter: opt.letter,
                option_text: opt.text,
                is_correct: opt.is_correct || false,
                explanation: opt.explanation || null
              }));

              const { error: optionsError } = await supabase
                .from('question_options')
                .insert(optionsToInsert);

              if (optionsError) {
                console.error(`Error inserting options: ${optionsError.message}`);
              }
            }

            insertedCount++;
            totalQuestionsInserted++;
          } catch (insertErr) {
            console.error(`Insert error: ${insertErr}`);
          }
        }

        console.log(`Inserted ${insertedCount} questions from ${pdfName}`);
        results.push({ 
          pdf: pdfName, 
          status: 'success', 
          extracted: extractedQuestions.length,
          inserted: insertedCount 
        });

        // Small delay between PDFs to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (pdfErr) {
        console.error(`Error processing ${pdfName}:`, pdfErr);
        results.push({ pdf: pdfName, status: 'error', error: String(pdfErr) });
      }
    }

    console.log(`\n[COMPLETE] Total questions inserted: ${totalQuestionsInserted}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} PDFs`,
        totalQuestionsInserted,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-process error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractQuestions(pdfBase64: string, pdfName: string, apiKey: string): Promise<any[]> {
  const systemPrompt = `You are a medical question extraction system. Extract ALL questions from this genetics PDF.

RULES:
1. Extract EVERY question completely
2. Include full question text with clinical vignettes
3. Include ALL answer options (A-E)
4. Mark the correct answer
5. Include complete explanation
6. Describe any images (pedigree diagrams, charts) in detail

For pedigree diagrams, describe:
- Inheritance pattern (autosomal dominant/recessive, X-linked)
- Which individuals are affected (filled symbols)
- Generation structure (I, II, III)
- Arrow pointing to patient/proband

OUTPUT FORMAT (JSON only, no markdown):
{
  "questions": [
    {
      "question_text": "Complete question text",
      "options": [
        {"letter": "A", "text": "Option text", "is_correct": false},
        {"letter": "B", "text": "Option text", "is_correct": true},
        {"letter": "C", "text": "Option text", "is_correct": false},
        {"letter": "D", "text": "Option text", "is_correct": false},
        {"letter": "E", "text": "Option text", "is_correct": false}
      ],
      "explanation": "Complete explanation",
      "has_image": true,
      "image_description": "Detailed image description",
      "category": "Genetics/Inheritance Patterns"
    }
  ]
}`;

  try {
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
          { 
            role: 'user', 
            content: [
              { type: 'text', text: `Extract all questions from this genetics PDF: ${pdfName}` },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 50000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error for ${pdfName}: ${response.status} - ${errorText}`);
      return [];
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    // Parse JSON
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const directJsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (directJsonMatch) {
      jsonStr = directJsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    return parsed.questions || [];

  } catch (err) {
    console.error(`Extraction error for ${pdfName}:`, err);
    return [];
  }
}
