import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { pdfs } = body; // Array of { name: string, data: string (base64) }

    if (!pdfs || !Array.isArray(pdfs) || pdfs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No PDFs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[UPLOAD] Uploading ${pdfs.length} PDFs to storage...`);

    const results = [];

    for (const pdf of pdfs) {
      try {
        // Convert base64 to Uint8Array
        const binaryString = atob(pdf.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Upload to storage
        const filePath = `genetics/${pdf.name}`;
        const { error: uploadError } = await supabase.storage
          .from('pdf-uploads')
          .upload(filePath, bytes, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error(`[ERROR] Failed to upload ${pdf.name}:`, uploadError.message);
          results.push({ name: pdf.name, status: 'error', error: uploadError.message });
        } else {
          console.log(`[SUCCESS] Uploaded ${pdf.name}`);
          results.push({ name: pdf.name, status: 'success' });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[ERROR] ${pdf.name}:`, errorMessage);
        results.push({ name: pdf.name, status: 'error', error: errorMessage });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`[COMPLETE] Uploaded ${successCount}/${pdfs.length} PDFs`);

    return new Response(
      JSON.stringify({
        success: true,
        uploaded: successCount,
        total: pdfs.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FATAL ERROR]:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
