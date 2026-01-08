import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, CheckCircle, XCircle, Loader2, Play, Pause, 
  RefreshCw, Database, AlertTriangle, Trash2, ArrowLeft,
  Image, Upload, Brain, Save
} from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker using unpkg (more reliable than cdnjs)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFConfig {
  name: string;
  category: string;
  expectedQuestions: number;
}

// Updated mapping based on user requirements:
// DNA Structure, Replication and Repair: 19 questions
// DNA Structure, Synthesis and Processing: 13 questions
// Gene Expression and Regulation: 8 questions
// Clinical Genetics: 20 questions
// Miscellaneous: 3 questions
const GENETICS_PDFS: PDFConfig[] = [
  // DNA Structure, Replication and Repair (19 questions total)
  { name: "genetics-1-5.pdf", category: "DNA Structure, Replication and Repair", expectedQuestions: 5 },
  { name: "genetics-2-6.pdf", category: "DNA Structure, Replication and Repair", expectedQuestions: 6 },
  { name: "genetics-3-6.pdf", category: "DNA Structure, Replication and Repair", expectedQuestions: 8 },
  
  // DNA Structure, Synthesis and Processing (13 questions total)
  { name: "genetics-4-6.pdf", category: "DNA Structure, Synthesis and Processing", expectedQuestions: 6 },
  { name: "genetics-5-7.pdf", category: "DNA Structure, Synthesis and Processing", expectedQuestions: 7 },
  
  // Gene Expression and Regulation (8 questions total)
  { name: "genetics-6-7.pdf", category: "Gene Expression and Regulation", expectedQuestions: 8 },
  
  // Clinical Genetics (20 questions total)
  { name: "genetics-7-5.pdf", category: "Clinical Genetics", expectedQuestions: 5 },
  { name: "genetics-8-5.pdf", category: "Clinical Genetics", expectedQuestions: 5 },
  { name: "genetics-1-8.pdf", category: "Clinical Genetics", expectedQuestions: 10 },
  
  // Miscellaneous (3 questions total)
  { name: "genetics-3-8.pdf", category: "Miscellaneous", expectedQuestions: 3 },
];

interface ProcessingResult {
  pdfName: string;
  status: "pending" | "rendering" | "uploading" | "analyzing" | "success" | "error" | "paused";
  pagesRendered: number;
  totalPages: number;
  pagesUploaded: number;
  questionsExtracted: number;
  error?: string;
  sessionId?: string;
}

const STORAGE_KEY = "genetics-batch-progress-v2";

export default function BatchProcessGenetics() {
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPdfIndex, setCurrentPdfIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [dbQuestionCount, setDbQuestionCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const pauseRef = useRef(false);
  const abortRef = useRef(false);

  // Fetch question count from database
  const fetchDbCount = useCallback(async () => {
    const { count } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true });
    setDbQuestionCount(count || 0);
    return count || 0;
  }, []);

  // Load saved progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setResults(parsed.results || []);
        setCurrentPdfIndex(parsed.currentIndex || 0);
        setLastSaved(parsed.lastSaved ? new Date(parsed.lastSaved) : null);
      } catch (e) {
        console.error("Error loading saved progress:", e);
      }
    }
    fetchDbCount();
  }, [fetchDbCount]);

  // Save progress
  const saveProgress = useCallback(() => {
    const progress = {
      results,
      currentIndex: currentPdfIndex,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    setLastSaved(new Date());
  }, [results, currentPdfIndex]);

  // Clear all progress
  const clearProgress = useCallback(async () => {
    if (!confirm("Clear all progress and delete extracted questions?")) return;
    
    localStorage.removeItem(STORAGE_KEY);
    setResults([]);
    setCurrentPdfIndex(0);
    setOverallProgress(0);
    
    // Delete questions from genetics PDFs
    const { error } = await supabase
      .from("questions")
      .delete()
      .like("source_pdf", "genetics-%");
    
    if (error) {
      toast.error("Failed to clear questions: " + error.message);
    } else {
      toast.success("Cleared all progress and questions");
      await fetchDbCount();
    }
  }, [fetchDbCount]);

  // Update result for a specific PDF
  const updateResult = useCallback((pdfName: string, updates: Partial<ProcessingResult>) => {
    setResults(prev => prev.map(r => 
      r.pdfName === pdfName ? { ...r, ...updates } : r
    ));
  }, []);

  // Render a single PDF page
  const renderPage = async (pdf: any, pageNum: number): Promise<{ pageNum: number; dataUrl: string }> => {
    const page = await pdf.getPage(pageNum);
    const scale = 2; // 144 DPI
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d')!;
    await page.render({ canvasContext: context, viewport }).promise;
    
    const dataUrl = canvas.toDataURL('image/png', 0.9);
    canvas.remove();
    
    return { pageNum, dataUrl };
  };

  // Convert data URL to Blob
  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Process a single PDF
  const processSinglePdf = async (config: PDFConfig): Promise<number> => {
    const pdfUrl = `/pdfs/${config.name}`;
    
    try {
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('pdf_processing_sessions')
        .insert({
          pdf_name: config.name,
          category: config.category,
          subject: 'Biochemistry',
          system: 'Genetics',
          status: 'rendering',
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      
      updateResult(config.name, { sessionId: session.id });

      // Fetch PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;

      updateResult(config.name, { totalPages, status: 'rendering' });

      // Update session with total pages
      await supabase
        .from('pdf_processing_sessions')
        .update({ total_pages: totalPages })
        .eq('id', session.id);

      // Step 1: Render pages in batches
      const RENDER_BATCH_SIZE = 5;
      const renderedPages: { pageNum: number; dataUrl: string }[] = [];

      for (let i = 0; i < totalPages; i += RENDER_BATCH_SIZE) {
        if (abortRef.current) throw new Error('Cancelled');
        while (pauseRef.current) {
          await new Promise(r => setTimeout(r, 500));
        }

        const batchEnd = Math.min(i + RENDER_BATCH_SIZE, totalPages);
        const batchPromises = [];

        for (let j = i; j < batchEnd; j++) {
          batchPromises.push(renderPage(pdf, j + 1));
        }

        const batchResults = await Promise.all(batchPromises);
        renderedPages.push(...batchResults);
        
        updateResult(config.name, { pagesRendered: renderedPages.length });
      }

      // Step 2: Upload to storage
      updateResult(config.name, { status: 'uploading' });

      const UPLOAD_BATCH_SIZE = 3;
      const uploadedUrls: { pageNum: number; url: string }[] = [];
      const basePath = `genetics/${session.id}`;

      for (let i = 0; i < renderedPages.length; i += UPLOAD_BATCH_SIZE) {
        if (abortRef.current) throw new Error('Cancelled');
        while (pauseRef.current) {
          await new Promise(r => setTimeout(r, 500));
        }

        const batch = renderedPages.slice(i, i + UPLOAD_BATCH_SIZE);
        const uploadPromises = batch.map(async (page) => {
          const blob = dataURLtoBlob(page.dataUrl);
          const filePath = `${basePath}/page-${page.pageNum.toString().padStart(3, '0')}.png`;
          
          const { error } = await supabase.storage
            .from('question-images')
            .upload(filePath, blob, { upsert: true });

          if (error) throw error;

          const { data: urlData } = supabase.storage
            .from('question-images')
            .getPublicUrl(filePath);

          return { pageNum: page.pageNum, url: urlData.publicUrl };
        });

        const batchResults = await Promise.all(uploadPromises);
        uploadedUrls.push(...batchResults);
        
        updateResult(config.name, { pagesUploaded: uploadedUrls.length });
      }

      // Step 3: Call edge function for AI analysis
      updateResult(config.name, { status: 'analyzing' });

      await supabase
        .from('pdf_processing_sessions')
        .update({ status: 'analyzing' })
        .eq('id', session.id);

      const { data: extractionResult, error: extractError } = await supabase.functions.invoke('pdf-chat-processor', {
        body: {
          sessionId: session.id,
          pageImages: uploadedUrls.map(p => ({ pageNum: p.pageNum, url: p.url })),
          pdfName: config.name,
          category: config.category,
          subject: 'Biochemistry',
          system: 'Genetics'
        }
      });

      if (extractError) throw extractError;

      const questionCount = extractionResult?.questionsExtracted || 0;
      
      updateResult(config.name, { 
        status: 'success', 
        questionsExtracted: questionCount 
      });

      return questionCount;

    } catch (error: any) {
      console.error(`Error processing ${config.name}:`, error);
      updateResult(config.name, { 
        status: 'error', 
        error: error.message 
      });
      return 0;
    }
  };

  // Start processing all PDFs
  const startProcessing = async (resumeFrom: number = 0) => {
    setIsProcessing(true);
    pauseRef.current = false;
    abortRef.current = false;
    setIsPaused(false);

    // Initialize results if starting fresh
    if (resumeFrom === 0 && results.length === 0) {
      setResults(GENETICS_PDFS.map(pdf => ({
        pdfName: pdf.name,
        status: 'pending',
        pagesRendered: 0,
        totalPages: 0,
        pagesUploaded: 0,
        questionsExtracted: 0
      })));
    }

    let totalExtracted = results.reduce((sum, r) => 
      r.status === 'success' ? sum + r.questionsExtracted : sum, 0
    );

    for (let i = resumeFrom; i < GENETICS_PDFS.length; i++) {
      if (abortRef.current) break;
      
      while (pauseRef.current) {
        await new Promise(r => setTimeout(r, 500));
      }

      setCurrentPdfIndex(i);
      setOverallProgress(Math.round((i / GENETICS_PDFS.length) * 100));

      const config = GENETICS_PDFS[i];
      const existingResult = results.find(r => r.pdfName === config.name);
      
      // Skip already completed PDFs
      if (existingResult?.status === 'success') {
        continue;
      }

      updateResult(config.name, { status: 'rendering', pagesRendered: 0, pagesUploaded: 0 });
      
      const extracted = await processSinglePdf(config);
      totalExtracted += extracted;

      // Save progress after each PDF
      saveProgress();
      await fetchDbCount();

      // Small delay between PDFs
      if (i < GENETICS_PDFS.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setOverallProgress(100);
    setIsProcessing(false);
    toast.success(`Completed! Extracted ${totalExtracted} questions total.`);
  };

  // Toggle pause
  const togglePause = () => {
    if (isPaused) {
      pauseRef.current = false;
      setIsPaused(false);
      toast.info("Resuming processing...");
    } else {
      pauseRef.current = true;
      setIsPaused(true);
      saveProgress();
      toast.info("Pausing after current operation...");
    }
  };

  // Cancel processing
  const cancelProcessing = () => {
    abortRef.current = true;
    setIsProcessing(false);
    saveProgress();
    toast.info("Processing cancelled");
  };

  // Get status icon
  const getStatusIcon = (status: ProcessingResult['status']) => {
    switch (status) {
      case 'pending': return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'rendering': return <Image className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'uploading': return <Upload className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'analyzing': return <Brain className="h-4 w-4 text-purple-500 animate-pulse" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-orange-500" />;
    }
  };

  // Get status text
  const getStatusText = (result: ProcessingResult) => {
    switch (result.status) {
      case 'pending': return 'Waiting...';
      case 'rendering': return `Rendering ${result.pagesRendered}/${result.totalPages || '?'} pages`;
      case 'uploading': return `Uploading ${result.pagesUploaded}/${result.totalPages} pages`;
      case 'analyzing': return 'AI extracting questions...';
      case 'success': return `✓ ${result.questionsExtracted} questions`;
      case 'error': return `Error: ${result.error}`;
      case 'paused': return 'Paused';
    }
  };

  // Calculate totals
  const totalExtracted = results.reduce((sum, r) => sum + r.questionsExtracted, 0);
  const completedCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const expectedTotal = GENETICS_PDFS.reduce((sum, p) => sum + p.expectedQuestions, 0);

  return (
    <AppLayout title="Batch PDF Processor">
      <div className="container max-w-4xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/pdf-chat">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Batch PDF Processor</h1>
              <p className="text-muted-foreground">Process all genetics PDFs automatically</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Database className="h-3 w-3" />
            {dbQuestionCount} in DB
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{GENETICS_PDFS.length}</div>
              <div className="text-sm text-muted-foreground">Total PDFs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{totalExtracted}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{expectedTotal}</div>
              <div className="text-sm text-muted-foreground">Expected</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        {isProcessing && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!isProcessing ? (
            <>
              <Button onClick={() => startProcessing(0)} className="gap-2">
                <Play className="h-4 w-4" />
                Start Processing All
              </Button>
              {results.some(r => r.status === 'success') && (
                <Button 
                  variant="outline" 
                  onClick={() => startProcessing(results.findIndex(r => r.status !== 'success'))}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Resume
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={togglePause} className="gap-2">
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="destructive" onClick={cancelProcessing} className="gap-2">
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={fetchDbCount} className="gap-2">
            <Database className="h-4 w-4" />
            Refresh Count
          </Button>
          <Button variant="ghost" onClick={clearProgress} className="gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
        </div>

        {lastSaved && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Save className="h-3 w-3" />
            Last saved: {lastSaved.toLocaleTimeString()}
          </div>
        )}

        {/* PDF List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PDFs to Process</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {GENETICS_PDFS.map((pdf, idx) => {
                  const result = results.find(r => r.pdfName === pdf.name);
                  const isActive = isProcessing && idx === currentPdfIndex;
                  
                  return (
                    <div 
                      key={pdf.name}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isActive ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {result ? getStatusIcon(result.status) : <FileText className="h-4 w-4 text-muted-foreground" />}
                        <div>
                          <div className="font-medium">{pdf.name}</div>
                          <div className="text-xs text-muted-foreground">{pdf.category}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-xs">
                          ~{pdf.expectedQuestions} Q
                        </Badge>
                        {result && (
                          <span className="text-sm text-muted-foreground min-w-[180px] text-right">
                            {getStatusText(result)}
                          </span>
                        )}
                        {isActive && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Error Summary */}
        {errorCount > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {errorCount} PDF(s) failed to process. You can retry by clicking "Resume" or "Start Processing All".
            </AlertDescription>
          </Alert>
        )}

        {/* Category Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { name: "DNA Structure, Replication and Repair", expected: 19 },
                { name: "DNA Structure, Synthesis and Processing", expected: 13 },
                { name: "Gene Expression and Regulation", expected: 8 },
                { name: "Clinical Genetics", expected: 20 },
                { name: "Miscellaneous", expected: 3 }
              ].map(cat => {
                const extracted = results
                  .filter(r => GENETICS_PDFS.find(p => p.name === r.pdfName)?.category === cat.name)
                  .reduce((sum, r) => sum + r.questionsExtracted, 0);
                
                return (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <span>{cat.name}</span>
                    <span className={extracted >= cat.expected ? "text-green-600 font-medium" : "text-muted-foreground"}>
                      {extracted} / {cat.expected}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
