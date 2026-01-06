import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/USMLE-ly/study-smart-hub/main/public/pdfs';

interface ExplanationScreenshot {
  section: string; // e.g., "main_concept", "diagram", "choice_explanations", "educational_objective"
  description: string;
  content_summary: string;
}

interface ExtractedQuestion {
  question_number: number;
  question_text: string;
  options: { letter: string; text: string; is_correct: boolean; explanation?: string }[];
  main_explanation: string;
  educational_objective: string;
  has_question_image: boolean;
  question_image_description?: string;
  // 4 explanation screenshots per question
  explanation_screenshots: ExplanationScreenshot[];
  choice_explanations?: { [key: string]: string };
}

// Generate educational image using AI
async function generateEducationalImage(
  apiKey: string,
  description: string,
  context: string
): Promise<string | null> {
  try {
    console.log(`[IMAGE GEN] Generating image for: ${description.substring(0, 100)}...`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: `Create a clear, professional medical education diagram for USMLE study. 
Context: ${context}
Image description: ${description}

Requirements:
- Clean, labeled anatomical/cellular diagram
- Clear labels with arrows pointing to structures
- Professional medical textbook style
- White or light background
- High contrast for readability
- Include all relevant structures mentioned`
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      console.error(`[IMAGE GEN ERROR] ${response.status}`);
      return null;
    }

    const result = await response.json();
    const imageData = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (imageData && imageData.startsWith('data:image')) {
      console.log(`[IMAGE GEN] Successfully generated image`);
      return imageData;
    }
    
    return null;
  } catch (error) {
    console.error('[IMAGE GEN ERROR]', error);
    return null;
  }
}

// Upload base64 image to Supabase storage
async function uploadImageToStorage(
  supabase: any,
  base64Data: string,
  fileName: string
): Promise<string | null> {
  try {
    // Extract base64 content (remove data:image/...;base64, prefix)
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      console.error('[UPLOAD] Invalid base64 format');
      return null;
    }
    
    const imageType = matches[1];
    const base64Content = matches[2];
    
    // Decode base64 to binary
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const filePath = `explanations/${fileName}.${imageType}`;
    
    const { data, error } = await supabase.storage
      .from('question-images')
      .upload(filePath, bytes.buffer, {
        contentType: `image/${imageType}`,
        upsert: true
      });
    
    if (error) {
      console.error('[UPLOAD ERROR]', error.message);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('question-images')
      .getPublicUrl(filePath);
    
    console.log(`[UPLOAD] Image uploaded: ${filePath}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[UPLOAD ERROR]', error);
    return null;
  }
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
    const { pdfName, category, subject = 'Genetics', skipExisting = false, generateImages = true } = body;

    if (!pdfName) {
      return new Response(
        JSON.stringify({ error: 'pdfName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PROCESS] Starting: ${pdfName}, category: ${category}, generateImages: ${generateImages}`);

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
    
    // Convert to base64
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

    // Limit base64 size
    const truncatedBase64 = pdfBase64.substring(0, 600000);
    console.log(`[AI] Sending ${truncatedBase64.length} chars to AI for extraction...`);

    // Use AI to extract questions WITH detailed image descriptions
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
            content: `You are a medical education expert extracting USMLE-style questions from PDFs. 
            
CRITICAL: For EVERY question, you must capture:
1. The COMPLETE question text with full clinical vignette
2. ALL answer options (A-E) with complete text
3. Which option is CORRECT
4. If there's an IMAGE in the question, describe it in FULL DETAIL
5. The COMPLETE explanation - capture EVERYTHING

FOR EACH QUESTION'S EXPLANATION, provide EXACTLY 4 "screenshots" that capture different parts:
- Screenshot 1: Main concept/mechanism explanation
- Screenshot 2: Any diagram, image, or visual content in the explanation (describe in detail)
- Screenshot 3: Individual choice explanations (why each choice is right/wrong)
- Screenshot 4: Educational objective and key takeaway

Return ONLY valid JSON, no markdown.`
          },
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: `Extract ALL questions from this ${category} PDF "${pdfName}". 

For each question, return this JSON structure:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Complete clinical vignette and question",
      "options": [
        {"letter": "A", "text": "option text", "is_correct": false},
        {"letter": "B", "text": "option text", "is_correct": true},
        ...
      ],
      "has_question_image": true/false,
      "question_image_description": "Detailed description of question image if present",
      "main_explanation": "COMPLETE explanation text - every word from the PDF",
      "explanation_screenshots": [
        {
          "section": "main_concept",
          "description": "The main mechanism/concept being tested",
          "content_summary": "Full text explaining the core concept, pathophysiology, or mechanism"
        },
        {
          "section": "diagram",
          "description": "Visual/diagram content - describe ALL labels, structures, arrows in detail",
          "content_summary": "Detailed description: Type of image, labeled structures A-B-C-D, key findings"
        },
        {
          "section": "choice_explanations",
          "description": "Why each answer choice is correct or incorrect",
          "content_summary": "(Choice A) explanation... (Choice B) explanation... etc."
        },
        {
          "section": "educational_objective",
          "description": "The key learning point",
          "content_summary": "Educational Objective: The specific learning goal"
        }
      ],
      "choice_explanations": {
        "A": "Why A is wrong/right...",
        "B": "Why B is wrong/right...",
        "C": "Why C is wrong/right...",
        "D": "Why D is wrong/right...",
        "E": "Why E is wrong/right..."
      },
      "educational_objective": "The educational objective text"
    }
  ]
}

IMPORTANT: Capture 4 explanation screenshots per question with detailed content.`
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

    // Parse JSON
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
      console.log('[RAW CONTENT]', content.substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: content.substring(0, 300) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[EXTRACTED] ${questions.length} questions from ${pdfName}`);

    // Insert questions into database
    let inserted = 0;
    let imagesGenerated = 0;
    
    for (const q of questions) {
      if (!q.question_text || q.question_text.length < 20) continue;

      // Build comprehensive explanation with choice explanations
      let fullExplanation = q.main_explanation || '';
      
      if (q.choice_explanations) {
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

      // Generate question image if needed
      let questionImageUrl: string | null = null;
      if (generateImages && q.has_question_image && q.question_image_description) {
        const imageData = await generateEducationalImage(
          apiKey,
          q.question_image_description,
          q.question_text.substring(0, 200)
        );
        if (imageData) {
          const fileName = `${pdfName.replace('.pdf', '')}-q${q.question_number || inserted + 1}-question-${Date.now()}`;
          questionImageUrl = await uploadImageToStorage(supabase, imageData, fileName);
          if (questionImageUrl) imagesGenerated++;
        }
      }

      // Generate 4 explanation screenshots
      const explanationImageUrls: string[] = [];
      if (generateImages && q.explanation_screenshots && q.explanation_screenshots.length > 0) {
        for (let i = 0; i < Math.min(4, q.explanation_screenshots.length); i++) {
          const screenshot = q.explanation_screenshots[i];
          if (screenshot.description && screenshot.content_summary) {
            const imageData = await generateEducationalImage(
              apiKey,
              `${screenshot.section}: ${screenshot.description}. Content: ${screenshot.content_summary}`,
              `USMLE ${category} explanation for: ${q.question_text.substring(0, 100)}`
            );
            if (imageData) {
              const fileName = `${pdfName.replace('.pdf', '')}-q${q.question_number || inserted + 1}-exp${i + 1}-${Date.now()}`;
              const url = await uploadImageToStorage(supabase, imageData, fileName);
              if (url) {
                explanationImageUrls.push(url);
                imagesGenerated++;
              }
            }
            // Small delay between image generations
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      // Use first explanation image as the main explanation_image_url
      const explanationImageUrl = explanationImageUrls.length > 0 ? explanationImageUrls[0] : null;

      const { data: qData, error: qError } = await supabase
        .from('questions')
        .insert({
          question_text: q.question_text,
          subject: subject,
          system: 'General',
          category: category,
          explanation: fullExplanation,
          has_image: q.has_question_image || false,
          image_description: q.question_image_description || null,
          question_image_url: questionImageUrl,
          explanation_image_url: explanationImageUrl,
          source_pdf: pdfName,
          difficulty: 'Medium'
        })
        .select('id')
        .single();

      if (qError) {
        console.error(`[DB ERROR] Question insert:`, qError.message);
        continue;
      }

      // Insert options with individual explanations
      if (q.options && q.options.length > 0) {
        const opts = q.options.map(o => ({
          question_id: qData.id,
          option_letter: o.letter,
          option_text: o.text,
          is_correct: o.is_correct || false,
          explanation: q.choice_explanations?.[o.letter] || o.explanation || null
        }));

        const { error: optErr } = await supabase.from('question_options').insert(opts);
        if (optErr) console.error(`[DB ERROR] Options:`, optErr.message);
      }

      // Store additional explanation image URLs in question_images table
      if (explanationImageUrls.length > 1) {
        const imageRecords = explanationImageUrls.slice(1).map((url, idx) => ({
          question_id: qData.id,
          file_path: url,
          storage_url: url,
          position: 'explanation',
          source_type: 'generated',
          image_order: idx + 2
        }));
        
        const { error: imgErr } = await supabase.from('question_images').insert(imageRecords);
        if (imgErr) console.error(`[DB ERROR] Question images:`, imgErr.message);
      }

      inserted++;
      
      // Small delay between questions
      if (generateImages && (q.has_question_image || (q.explanation_screenshots && q.explanation_screenshots.length > 0))) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[COMPLETE] Inserted ${inserted}/${questions.length} questions, ${imagesGenerated} images for ${pdfName}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdfName,
        category,
        extracted: questions.length,
        inserted,
        imagesGenerated
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
