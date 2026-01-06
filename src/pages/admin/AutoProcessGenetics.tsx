import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Play, RefreshCw, FileText, Zap } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";

// PDFs are in the local public folder
const GENETICS_PDFS = [
  { name: 'genetics-1-5.pdf', category: 'DNA Structure, Replication and Repair', expectedQuestions: 5 },
  { name: 'genetics-1-8.pdf', category: 'DNA Structure, Replication and Repair', expectedQuestions: 8 },
  { name: 'genetics-2-6.pdf', category: 'DNA Structure, Synthesis and Processing', expectedQuestions: 6 },
  { name: 'genetics-3-6.pdf', category: 'Gene Expression and Regulation', expectedQuestions: 6 },
  { name: 'genetics-3-8.pdf', category: 'Gene Expression and Regulation', expectedQuestions: 2 },
  { name: 'genetics-4-6.pdf', category: 'Clinical Genetics', expectedQuestions: 6 },
  { name: 'genetics-5-7.pdf', category: 'Clinical Genetics', expectedQuestions: 7 },
  { name: 'genetics-6-7.pdf', category: 'Clinical Genetics', expectedQuestions: 7 },
  { name: 'genetics-7-5.pdf', category: 'Miscellaneous', expectedQuestions: 3 },
  { name: 'genetics-8-5.pdf', category: 'Miscellaneous', expectedQuestions: 5 },
];

// Expected totals
const EXPECTED_TOTALS: Record<string, number> = {
  'DNA Structure, Replication and Repair': 19,
  'DNA Structure, Synthesis and Processing': 13,
  'Gene Expression and Regulation': 8,
  'Clinical Genetics': 20,
  'Miscellaneous': 3,
};

interface ProcessResult {
  pdf: string;
  category: string;
  status: 'pending' | 'downloading' | 'processing' | 'success' | 'error' | 'skipped';
  questionsExtracted?: number;
  error?: string;
}

export default function AutoProcessGenetics() {
  const [results, setResults] = useState<ProcessResult[]>(
    GENETICS_PDFS.map(pdf => ({ pdf: pdf.name, category: pdf.category, status: 'pending' }))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Auto-start on mount (triggered by AI)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === 'true' && !isProcessing && !autoStart) {
      setAutoStart(true);
      setTimeout(() => processAllPdfs(), 1000);
    }
  }, []);

  // Helper to convert ArrayBuffer to base64 in chunks
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  };

  // Process a single PDF
  const processSinglePdf = async (pdfInfo: typeof GENETICS_PDFS[0], index: number): Promise<ProcessResult> => {
    const { name, category } = pdfInfo;
    
    // Update status to downloading
    setResults(prev => prev.map((r, i) => 
      i === index ? { ...r, status: 'downloading' as const } : r
    ));
    setCurrentStep(`Downloading ${name}...`);

    try {
      // Download PDF from local public folder
      const response = await fetch(`/pdfs/${name}`);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      const base64Data = arrayBufferToBase64(buffer);
      console.log(`Downloaded ${name}: ${buffer.byteLength} bytes, base64: ${base64Data.length} chars`);

      // Update status to processing
      setResults(prev => prev.map((r, i) => 
        i === index ? { ...r, status: 'processing' as const } : r
      ));
      setCurrentStep(`Extracting questions from ${name} with AI...`);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('process-single-genetics-pdf', {
        body: { 
          pdfName: name, 
          pdfBase64: base64Data,
          category: category,
          subject: 'Genetics',
          skipExisting: false
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.skipped) {
        return {
          pdf: name,
          category,
          status: 'skipped',
          questionsExtracted: 0
        };
      }

      const extracted = data?.inserted || data?.extracted || 0;
      
      return {
        pdf: name,
        category,
        status: 'success',
        questionsExtracted: extracted
      };

    } catch (err: any) {
      console.error(`Error processing ${name}:`, err);
      return {
        pdf: name,
        category,
        status: 'error',
        error: err.message
      };
    }
  };

  const processAllPdfs = async () => {
    setIsProcessing(true);
    setTotalQuestions(0);

    // Reset all to pending
    setResults(GENETICS_PDFS.map(pdf => ({ pdf: pdf.name, category: pdf.category, status: 'pending' })));

    let totalExtracted = 0;
    const newResults: ProcessResult[] = [];

    // Process PDFs one at a time
    for (let i = 0; i < GENETICS_PDFS.length; i++) {
      const result = await processSinglePdf(GENETICS_PDFS[i], i);
      newResults.push(result);
      
      // Update the results array
      setResults(prev => {
        const updated = [...prev];
        updated[i] = result;
        return updated;
      });

      if (result.status === 'success' && result.questionsExtracted) {
        totalExtracted += result.questionsExtracted;
        setTotalQuestions(totalExtracted);
      }

      // Small delay between PDFs
      if (i < GENETICS_PDFS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successCount = newResults.filter(r => r.status === 'success').length;
    const errorCount = newResults.filter(r => r.status === 'error').length;

    if (errorCount === 0) {
      toast.success(`Complete! ${totalExtracted} questions extracted from ${successCount} PDFs`);
    } else {
      toast.warning(`Completed with ${errorCount} errors. ${totalExtracted} questions extracted.`);
    }

    setIsProcessing(false);
    setCurrentStep('');
  };

  const completedCount = results.filter(r => r.status === 'success' || r.status === 'skipped').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const progress = ((completedCount + errorCount) / GENETICS_PDFS.length) * 100;

  // Group results by category
  const categorizedResults = Object.entries(EXPECTED_TOTALS).map(([category, expected]) => ({
    category,
    expected,
    pdfs: results.filter(r => r.category === category),
    total: results.filter(r => r.category === category).reduce((sum, r) => sum + (r.questionsExtracted || 0), 0)
  }));

  return (
    <AppLayout title="Auto Process Genetics PDFs">
      <div className="container mx-auto p-6 max-w-5xl space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Automated Genetics PDF Processing
                </CardTitle>
                <CardDescription className="mt-2">
                  Extracts USMLE-style questions from local PDFs using AI
                </CardDescription>
              </div>
              <Button 
                onClick={processAllPdfs} 
                disabled={isProcessing}
                size="lg"
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Processing
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Expected Questions Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {Object.entries(EXPECTED_TOTALS).map(([category, count]) => (
                <div key={category} className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{count}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{category}</div>
                </div>
              ))}
            </div>

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    {currentStep}
                  </span>
                  <span className="font-medium">{totalQuestions} questions extracted</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="text-xs text-muted-foreground text-center">
                  {completedCount + errorCount} / {GENETICS_PDFS.length} PDFs processed
                </div>
              </div>
            )}

            {/* Total extracted after processing */}
            {!isProcessing && totalQuestions > 0 && (
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg mb-6">
                <div className="text-3xl font-bold text-green-600">{totalQuestions}</div>
                <div className="text-sm text-green-700">Total Questions Extracted</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results by Category */}
        {categorizedResults.map(({ category, expected, pdfs, total }) => (
          <Card key={category}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {category}
                </CardTitle>
                <Badge variant={total >= expected ? "default" : "secondary"}>
                  {total} / {expected} questions
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="py-2">
              <div className="space-y-2">
                {pdfs.map((result) => (
                  <div 
                    key={result.pdf}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {result.status === 'pending' && (
                        <div className="h-4 w-4 rounded-full bg-muted-foreground/30" />
                      )}
                      {result.status === 'downloading' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {result.status === 'processing' && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {result.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {result.status === 'skipped' && (
                        <CheckCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      {result.status === 'error' && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-mono text-sm">{result.pdf}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.status === 'downloading' && 'Downloading...'}
                      {result.status === 'processing' && 'Extracting questions...'}
                      {result.status === 'success' && (
                        <span className="text-green-600 font-medium">
                          {result.questionsExtracted} questions
                        </span>
                      )}
                      {result.status === 'skipped' && (
                        <span className="text-yellow-600">Already processed</span>
                      )}
                      {result.status === 'error' && (
                        <span className="text-destructive">{result.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Workflow Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Automated Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl mb-2">📥</div>
                <div className="font-medium text-sm">1. Download</div>
                <div className="text-xs text-muted-foreground">Fetch PDFs locally</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-medium text-sm">2. AI Extraction</div>
                <div className="text-xs text-muted-foreground">Parse questions & answers</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl mb-2">🖼️</div>
                <div className="font-medium text-sm">3. Image Detection</div>
                <div className="text-xs text-muted-foreground">Identify embedded images</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl mb-2">💾</div>
                <div className="font-medium text-sm">4. Database Upload</div>
                <div className="text-xs text-muted-foreground">Store in question bank</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
