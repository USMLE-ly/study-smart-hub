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

  const processAllPdfs = async () => {
    setIsProcessing(true);
    setTotalQuestions(0);

    for (let i = 0; i < GENETICS_PDFS.length; i++) {
      const pdfName = GENETICS_PDFS[i];
      setCurrentPdf(pdfName);
      
      // Update status to processing
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'processing' } : r
      ));

      try {
        // Fetch PDF from public folder
        const response = await fetch(`/pdfs/${pdfName}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${pdfName}`);
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte), ''
          )
        );

        console.log(`Processing ${pdfName}, size: ${arrayBuffer.byteLength} bytes`);

        // Call parsing function
        const { data, error } = await supabase.functions.invoke('parse-pdf-questions', {
          body: {
            pdfBase64: base64,
            pdfFileName: pdfName,
            pdfId: `genetics_${i}`,
            pdfOrderIndex: i,
            subject: 'Genetics',
            system: 'General'
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        // Insert extracted questions into database
        const questions = data?.questions || data?.legacy_format?.questions || [];
        let insertedCount = 0;

        for (const q of questions) {
          try {
            // Insert question
            const { data: questionData, error: qError } = await supabase
              .from('questions')
              .insert({
                question_text: q.question_text || q.text,
                subject: 'Genetics',
                system: 'General',
                explanation: q.explanation_text || q.explanation,
                category: q.category || 'Genetics',
                has_image: q.images?.length > 0 || q.has_image,
                image_description: q.images?.[0]?.description || q.image_description,
                source_pdf: pdfName,
                difficulty: 'Medium'
              })
              .select('id')
              .single();

            if (qError) {
              console.error('Question insert error:', qError);
              continue;
            }

            // Insert options
            const options = q.answer_choices || q.options || [];
            if (options.length > 0) {
              const optionsToInsert = options.map((opt: any) => ({
                question_id: questionData.id,
                option_letter: opt.choice_id?.split('_').pop() || opt.letter || 'A',
                option_text: opt.choice_text || opt.text,
                is_correct: opt.is_correct || false,
                explanation: opt.explanation || null
              }));

              await supabase.from('question_options').insert(optionsToInsert);
            }

            insertedCount++;
          } catch (insertErr) {
            console.error('Insert error:', insertErr);
          }
        }

        setTotalQuestions(prev => prev + insertedCount);
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'success', questionsExtracted: insertedCount } : r
        ));

        toast.success(`${pdfName}: ${insertedCount} questions extracted`);

      } catch (err: any) {
        console.error(`Error processing ${pdfName}:`, err);
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'error', error: err.message } : r
        ));
        toast.error(`${pdfName}: ${err.message}`);
      }

      // Small delay between PDFs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
    setCurrentPdf(null);
    toast.success(`Complete! Total: ${totalQuestions} questions extracted`);
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
