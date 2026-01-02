import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedQuestion {
  question_text: string;
  options: { letter: string; text: string; is_correct: boolean; explanation?: string }[];
  explanation: string;
  category?: string;
  has_image?: boolean;
  image_description?: string;
  question_image_url?: string;
  explanation_image_url?: string;
}

interface ImageData {
  data: string; // base64
  contentType: string;
  pageNumber: number;
  imageIndex: number;
}

async function uploadImageToStorage(
  supabase: ReturnType<typeof createClient>,
  imageData: ImageData,
  pdfFileName: string
): Promise<string | null> {
  try {
    const fileName = `${pdfFileName.replace(/\.pdf$/i, '')}_page${imageData.pageNumber}_img${imageData.imageIndex}.${imageData.contentType.split('/')[1] || 'png'}`;
    const filePath = `extracted/${Date.now()}_${fileName}`;
    
    // Decode base64 to Uint8Array
    const binaryData = Uint8Array.from(atob(imageData.data), c => c.charCodeAt(0));
    
    const { data, error } = await supabase.storage
      .from('question-images')
      .upload(filePath, binaryData, {
        contentType: imageData.contentType,
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('question-images')
      .getPublicUrl(filePath);

    console.log(`Uploaded image: ${filePath}`);
    return urlData.publicUrl;
  } catch (err) {
    console.error('Failed to upload image:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, pdfBase64, pdfFileName, subject, system, extractImages } = await req.json();
    
    if (!pdfText || !subject || !system) {
      return new Response(
        JSON.stringify({ error: 'pdfText, subject, and system are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing PDF text for subject: ${subject}, system: ${system}`);
    console.log(`PDF text length: ${pdfText.length} characters`);
    console.log(`Extract images: ${extractImages}, Has PDF base64: ${!!pdfBase64}`);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Initialize Supabase client for image uploads
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clean the text - remove CamScanner and other artifacts
    const cleanedText = pdfText
      .replace(/CamScanner/gi, '')
      .replace(/CS\s*CamScanner/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // If we have base64 PDF data, use vision model to extract images
    let extractedImages: ImageData[] = [];
    let visionAnalysis = '';
    
    if (extractImages && pdfBase64) {
      console.log('Analyzing PDF with vision model for image extraction...');
      
      try {
        // Use vision model to analyze and describe images in the PDF
        const visionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { 
                role: 'user', 
                content: [
                  {
                    type: 'text',
                    text: `Analyze this medical education PDF and identify ALL images, diagrams, figures, charts, or visual elements. For each image found:

1. Describe what the image shows in detail (medical diagrams, burns, skin conditions, anatomical structures, etc.)
2. Note which question number the image is associated with (if any)
3. Describe the position and context of the image

Return a JSON response:
{
  "images_found": [
    {
      "description": "Detailed description of the image",
      "associated_question": "Question number if applicable (e.g., 'Q1', 'Q5')",
      "image_type": "Type: diagram, photo, chart, illustration",
      "medical_content": "What medical concept the image illustrates",
      "page_location": "Where on the page the image appears"
    }
  ],
  "total_images": number,
  "summary": "Brief summary of visual content in this PDF"
}`
                  },
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
            max_tokens: 8000,
          }),
        });

        if (visionResponse.ok) {
          const visionResult = await visionResponse.json();
          visionAnalysis = visionResult.choices?.[0]?.message?.content || '';
          console.log('Vision analysis complete:', visionAnalysis.substring(0, 500));
        } else {
          console.log('Vision analysis not available, continuing with text extraction only');
        }
      } catch (visionErr) {
        console.error('Vision analysis failed:', visionErr);
      }
    }

    const systemPrompt = `You are a medical question extraction expert specializing in USMLE, NBME, and medical board exam content. Your task is to extract ALL multiple-choice questions from the provided PDF text with DETAILED explanations.

CRITICAL EXTRACTION RULES:

1. QUESTION TEXT:
   - Extract the EXACT question text as written in the PDF
   - Include any clinical vignette, patient history, or case details that precede the actual question
   - Preserve medical terminology exactly as written
   - Note if the question mentions an image, diagram, or figure (set has_image: true)

2. ANSWER OPTIONS:
   - Extract ALL answer options (A, B, C, D, E) exactly as written
   - Identify the correct answer from explicit markers like "Answer:", "Correct:", "Ans:", checkmarks, or highlighted text
   - If no correct answer is marked, analyze the content to determine the most likely correct answer

3. DETAILED EXPLANATIONS (CRITICAL):
   - Extract the FULL explanation from the PDF - do not summarize or shorten
   - Include all medical reasoning, pathophysiology, and clinical correlations
   - Preserve step-by-step explanations that show why the correct answer is right
   - Include explanations for why incorrect options are wrong (if provided)
   - Include any mnemonics, clinical pearls, or high-yield facts mentioned
   - If the explanation references specific diseases, mechanisms, or pathways, include all details

4. CATEGORIZATION:
   - Assign a specific topic/category based on the question content (e.g., "Burn Classification", "Immunodeficiency Disorders", "Cardiac Arrhythmias")
   - Be specific with categories - not just "${subject}" but the specific topic within it

5. IMAGE HANDLING:
   - If the question or explanation mentions an image, diagram, photo, or figure, set has_image: true
   - Provide an image_description describing what the image shows based on the visual analysis provided
   ${visionAnalysis ? `
   
VISUAL ANALYSIS FROM PDF:
${visionAnalysis}

Use this visual analysis to:
- Match images to their corresponding questions
- Include accurate image descriptions
- Set has_image: true for questions with visual content` : ''}

Return a JSON array in this EXACT format:
{
  "questions": [
    {
      "question_text": "Full clinical vignette and question text",
      "options": [
        {"letter": "A", "text": "Option text", "is_correct": false, "explanation": "Why this is incorrect"},
        {"letter": "B", "text": "Option text", "is_correct": true, "explanation": "Why this is correct"},
        {"letter": "C", "text": "Option text", "is_correct": false, "explanation": "Why this is incorrect"},
        {"letter": "D", "text": "Option text", "is_correct": false, "explanation": "Why this is incorrect"}
      ],
      "explanation": "FULL detailed explanation from PDF including pathophysiology, clinical reasoning, and all educational content. Do not truncate.",
      "category": "Specific topic category",
      "has_image": false,
      "image_description": ""
    }
  ]
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown formatting or extra text
- Extract every question you find - do not skip any
- Preserve the full length of explanations - they are critical for learning
- Include clinical pearls, mnemonics, and high-yield points in explanations`;

    const userPrompt = `Extract ALL questions from this ${subject} / ${system} medical education PDF:

${cleanedText}

REQUIREMENTS:
1. Extract EVERY question with its complete clinical vignette
2. Include ALL answer options with correct marking
3. Extract the FULL explanation - do not summarize (this is critical for student learning)
4. Assign specific topic categories (e.g., "Rule of 9s for Burns", not just "Burns")
5. Note any references to images or diagrams
6. Include option-specific explanations when provided
7. Return ONLY valid JSON`;

    console.log('Calling AI to extract questions with detailed explanations...');

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
        max_tokens: 32000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'API credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
      
      // Also try to find JSON object directly
      const directJsonMatch = jsonStr.match(/\{[\s\S]*"questions"[\s\S]*\}/);
      if (directJsonMatch) {
        jsonStr = directJsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonStr);
      questions = parsed.questions || parsed;
      
      if (!Array.isArray(questions)) {
        questions = [questions];
      }

      console.log(`Successfully extracted ${questions.length} questions`);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content:', content.substring(0, 1000));
      throw new Error('Failed to parse AI response as valid JSON');
    }

    // Parse vision analysis to get image URLs if available
    let imageAnalysis: any[] = [];
    if (visionAnalysis) {
      try {
        const visionMatch = visionAnalysis.match(/\{[\s\S]*"images_found"[\s\S]*\}/);
        if (visionMatch) {
          const visionParsed = JSON.parse(visionMatch[0]);
          imageAnalysis = visionParsed.images_found || [];
          console.log(`Found ${imageAnalysis.length} images in vision analysis`);
        }
      } catch (err) {
        console.log('Could not parse vision analysis JSON');
      }
    }

    // Validate and enrich questions
    const validQuestions = questions.filter(q => {
      return q.question_text && 
             q.question_text.length > 10 &&
             Array.isArray(q.options) && 
             q.options.length >= 2 &&
             q.options.some(o => o.is_correct);
    }).map((q, index) => {
      // Try to match with image analysis
      const questionNum = index + 1;
      const matchedImage = imageAnalysis.find(img => 
        img.associated_question?.toLowerCase().includes(`q${questionNum}`) ||
        img.associated_question?.toLowerCase().includes(`question ${questionNum}`)
      );

      return {
        ...q,
        question_text: q.question_text.replace(/CamScanner/gi, '').trim(),
        explanation: (q.explanation || '').replace(/CamScanner/gi, '').trim(),
        subject,
        system: q.category || system,
        category: q.category || system,
        has_image: q.has_image || !!matchedImage,
        image_description: q.image_description || matchedImage?.description || '',
        // Add matched image info
        image_type: matchedImage?.image_type || null,
        medical_content: matchedImage?.medical_content || null,
        // Enrich option explanations
        options: q.options.map(opt => ({
          ...opt,
          text: opt.text.replace(/CamScanner/gi, '').trim(),
          explanation: (opt.explanation || '').replace(/CamScanner/gi, '').trim()
        }))
      };
    });

    console.log(`Returning ${validQuestions.length} valid questions with detailed explanations`);
    console.log(`Questions with images: ${validQuestions.filter(q => q.has_image).length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        questions: validQuestions,
        totalExtracted: questions.length,
        validCount: validQuestions.length,
        imagesFound: imageAnalysis.length,
        visionAnalysisAvailable: !!visionAnalysis
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
