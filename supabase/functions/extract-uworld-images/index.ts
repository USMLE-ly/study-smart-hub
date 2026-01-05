import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MedicalImage {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  description: string;
  page_number: number;
  image_base64?: string;
  storage_url?: string;
}

interface ExtractionResult {
  success: boolean;
  images: MedicalImage[];
  total_extracted: number;
  categories: Record<string, number>;
  errors: string[];
}

// Medical topic categorization
const MEDICAL_CATEGORIES: Record<string, string[]> = {
  'Anatomy': ['development', 'embryology', 'anatomy', 'structure', 'formation', 'descent', 'septation'],
  'Cardiology': ['heart', 'cardiac', 'aortic', 'valve', 'atrial', 'ventricular', 'artery', 'circulation', 'truncus'],
  'Nephrology': ['kidney', 'renal', 'urethral', 'ureter', 'hydronephrosis', 'bladder'],
  'Gastroenterology': ['intestine', 'colon', 'rectum', 'hirschsprung', 'vitelline', 'gut', 'atresia'],
  'Genetics': ['pedigree', 'chromosome', 'inheritance', 'autosomal', 'x-linked', 'genetic'],
  'Endocrinology': ['pituitary', 'thyroid', 'acromegaly', 'hormone', 'adrenal'],
  'Neurology': ['neural', 'brain', 'holoprosencephaly', 'meningitis', 'seizure'],
  'Dermatology': ['skin', 'rash', 'tinea', 'purpura', 'versicolor'],
  'Immunology': ['vasculitis', 'kawasaki', 'lupus', 'autoimmune'],
  'Infectious Disease': ['mumps', 'parotitis', 'orchitis'],
  'Pediatrics': ['fetal', 'alcohol', 'syndrome', 'congenital', 'neonatal'],
  'Urology': ['hypospadias', 'epispadias', 'testes', 'hydrocele', 'processus'],
  'Oncology': ['cancer', 'tumor', 'neoplasm', 'malignant'],
  'Pathology': ['disease', 'defect', 'abnormal', 'pathology'],
};

function categorizeImage(title: string, description: string): { category: string; subcategory: string } {
  const combinedText = `${title} ${description}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(MEDICAL_CATEGORIES)) {
    for (const keyword of keywords) {
      if (combinedText.includes(keyword)) {
        // Create subcategory from title
        const subcategory = title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        return { category, subcategory };
      }
    }
  }
  
  return { category: 'General', subcategory: title };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, pdfFileName, userId } = await req.json();
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'pdfBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[START] Processing UWorld Images PDF: ${pdfFileName}`);
    console.log(`PDF base64 length: ${pdfBase64.length} characters`);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // System prompt for image extraction
    const systemPrompt = `You are an automated medical image extraction system for UWorld study materials.

Your task is to analyze each page of the PDF and extract information about every medical diagram, illustration, chart, or anatomical image present.

For EACH image/diagram found, you must provide:
1. A clear title (taken from the image header or context)
2. A detailed description of what the image shows
3. The page number where it appears
4. Key medical concepts illustrated

EXTRACTION RULES:
- Process EVERY single page
- Identify EVERY image, diagram, chart, or illustration
- Describe anatomical structures, labels, and educational content
- Note any comparison images (e.g., Normal vs Abnormal)
- Preserve exact medical terminology from labels

OUTPUT FORMAT (strict JSON):
{
  "images": [
    {
      "page": 1,
      "title": "Kidney Development",
      "description": "Anatomical diagram showing embryonic kidney development with labeled structures including pronephros, mesonephros, and metanephros. Shows progression from embryonic to fetal kidney formation.",
      "labels": ["Pronephros", "Mesonephros", "Ureteric bud", "Metanephric blastema"],
      "concepts": ["Embryology", "Renal development"]
    }
  ],
  "total_pages_processed": 50,
  "total_images_found": 150
}`;

    const userPrompt = `Analyze this UWorld Images PDF and extract information about EVERY medical image, diagram, and illustration.

For each image found:
1. Page number where it appears
2. Title/header of the image
3. Complete description of what the image shows (anatomical structures, pathological features, comparisons)
4. All visible labels and annotations
5. Key medical concepts being illustrated

Return ONLY valid JSON with the extracted image information.`;

    console.log('[STEP 1] Sending PDF to vision model for image analysis...');
    
    const visionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
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
        max_tokens: 100000,
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Vision API error:', visionResponse.status, errorText);
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionResult = await visionResponse.json();
    const content = visionResult.choices?.[0]?.message?.content || '';

    console.log('[STEP 2] Parsing extraction results...');

    // Parse JSON response
    let extractedImages: any[] = [];
    
    try {
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
      extractedImages = parsed.images || [];
      
      console.log(`Parsed ${extractedImages.length} images from response`);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Process and categorize images
    console.log('[STEP 3] Categorizing and storing images...');
    
    const processedImages: MedicalImage[] = [];
    const categoryCounts: Record<string, number> = {};
    const errors: string[] = [];

    for (let i = 0; i < extractedImages.length; i++) {
      const img = extractedImages[i];
      
      try {
        const { category, subcategory } = categorizeImage(img.title || '', img.description || '');
        
        const medicalImage: MedicalImage = {
          id: `uworld_${pdfFileName?.replace(/\.pdf$/i, '') || 'unknown'}_p${img.page}_${i + 1}`,
          title: img.title || `Image ${i + 1}`,
          category,
          subcategory,
          description: img.description || '',
          page_number: img.page || i + 1,
        };

        processedImages.push(medicalImage);
        
        // Count categories
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;

        // Store in database - create medical_images table if inserting
        const { error: insertError } = await supabase
          .from('question_images')
          .insert({
            question_id: null, // These are reference images, not question-specific
            file_path: `uworld_images/${medicalImage.id}`,
            position: 'reference',
            source_type: 'uworld_pdf',
            image_order: i + 1,
          });

        if (insertError) {
          console.log(`Note: Could not insert image ${medicalImage.id}:`, insertError.message);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Image ${i + 1}: ${errorMessage}`);
      }
    }

    console.log(`[COMPLETE] Processed ${processedImages.length} images`);
    console.log('Categories:', categoryCounts);

    const result: ExtractionResult = {
      success: true,
      images: processedImages,
      total_extracted: processedImages.length,
      categories: categoryCounts,
      errors,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing UWorld images PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        images: [],
        total_extracted: 0,
        categories: {},
        errors: [errorMessage]
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
