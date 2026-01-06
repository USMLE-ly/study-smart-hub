import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Upload, Play } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

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

interface ProcessResult {
  pdf: string;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  questionsExtracted?: number;
  error?: string;
}

export default function AutoProcessGenetics() {
  const [results, setResults] = useState<ProcessResult[]>(
    GENETICS_PDFS.map(pdf => ({ pdf, status: 'pending' }))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPdf, setCurrentPdf] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Helper to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Load PDFs from public folder and create a data map
  const loadPdfsAsBase64 = async (): Promise<Record<string, string>> => {
    const pdfDataMap: Record<string, string> = {};
    
    for (const pdfName of GENETICS_PDFS) {
      try {
        setCurrentPdf(`Loading ${pdfName}...`);
        const response = await fetch(`/pdfs/${pdfName}`);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          pdfDataMap[pdfName] = arrayBufferToBase64(buffer);
          console.log(`Loaded ${pdfName}: ${buffer.byteLength} bytes`);
        } else {
          console.warn(`Failed to load ${pdfName}: ${response.status}`);
        }
      } catch (err) {
        console.error(`Error loading ${pdfName}:`, err);
      }
    }
    
    return pdfDataMap;
  };

  const processAllPdfs = async () => {
    setIsProcessing(true);
    setTotalQuestions(0);

    // Update all to uploading
    setResults(prev => prev.map(r => ({ ...r, status: 'uploading' as const })));
    setCurrentPdf('Loading PDFs from public folder...');

    try {
      // Load all PDFs as base64
      const pdfDataMap = await loadPdfsAsBase64();
      
      if (Object.keys(pdfDataMap).length === 0) {
        throw new Error('No PDFs could be loaded from public folder');
      }
      
      console.log(`Loaded ${Object.keys(pdfDataMap).length} PDFs`);
      
      // Step 1: Upload PDFs to storage first
      setCurrentPdf('Uploading PDFs to storage...');
      const pdfsToUpload = Object.entries(pdfDataMap).map(([name, data]) => ({ name, data }));
      
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-genetics-pdfs', {
        body: { pdfs: pdfsToUpload }
      });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Continue anyway - PDFs might already be in storage
      } else {
        console.log('Upload results:', uploadData);
      }
      
      // Update all to processing
      setResults(prev => prev.map(r => ({ ...r, status: 'processing' as const })));
      setCurrentPdf('Processing with AI...');

      // Step 2: Call the edge function to process from storage
      const { data, error } = await supabase.functions.invoke('process-genetics-automated', {
        body: {
          startFromIndex: 0,
          generateImages: true,
          skipExisting: false // Force reprocessing
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('Processing results:', data);

      // Update results from response
      if (data?.results) {
        const updatedResults = GENETICS_PDFS.map(pdfName => {
          const result = data.results.find((r: any) => r.pdf_name === pdfName);
          if (result) {
            return {
              pdf: pdfName,
              status: result.status === 'success' ? 'success' as const : 
                      result.status === 'skipped' ? 'success' as const : 'error' as const,
              questionsExtracted: result.questions_extracted,
              error: result.error
            };
          }
          return { pdf: pdfName, status: 'pending' as const };
        });
        setResults(updatedResults);
        setTotalQuestions(data.summary?.total_questions_inserted || 0);
      }

      toast.success(`Complete! ${data.summary?.total_questions_inserted || 0} questions extracted`);

    } catch (err: any) {
      console.error('Processing error:', err);
      toast.error(`Error: ${err.message}`);
      setResults(prev => prev.map(r => ({ ...r, status: 'error' as const, error: err.message })));
    }

    setIsProcessing(false);
    setCurrentPdf(null);
  };

  const completedCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const progress = ((completedCount + errorCount) / GENETICS_PDFS.length) * 100;

  return (
    <AppLayout title="Auto Process Genetics PDFs">
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Automatic Genetics PDF Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">
                  Process all {GENETICS_PDFS.length} Genetics PDFs automatically
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Questions will be extracted and uploaded to the database
                </p>
              </div>
              <Button 
                onClick={processAllPdfs} 
                disabled={isProcessing}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Processing
                  </>
                )}
              </Button>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress: {completedCount + errorCount}/{GENETICS_PDFS.length}</span>
                  <span>{totalQuestions} questions extracted</span>
                </div>
                <Progress value={progress} className="h-2" />
                {currentPdf && (
                  <p className="text-sm text-muted-foreground">
                    Currently processing: {currentPdf}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              {results.map((result, idx) => (
                <div 
                  key={result.pdf}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {result.status === 'pending' && (
                      <div className="h-4 w-4 rounded-full bg-muted-foreground/30" />
                    )}
                    {result.status === 'processing' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {result.status === 'success' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {result.status === 'error' && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-medium">{result.pdf}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {result.status === 'success' && `${result.questionsExtracted} questions`}
                    {result.status === 'error' && result.error}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
