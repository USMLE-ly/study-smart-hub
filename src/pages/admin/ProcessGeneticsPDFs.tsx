import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, CheckCircle, XCircle, Loader2, Image, Upload, Save, RefreshCw, Pause, Play } from "lucide-react";

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/USMLE-ly/study-smart-hub/969ac5447c2b475b4fea7d5a2d9e94670508cc25/public/pdfs";
const STORAGE_KEY = "genetics-processing-progress";

interface PDFConfig {
  name: string;
  category: string;
  expectedQuestions: number;
}

// Total: 42 questions (removed genetics-1-8.pdf, genetics-3-8.pdf, 2.pdf)
const GENETICS_PDFS: PDFConfig[] = [
  // DNA Structure, Replication and Repair (11 total)
  { name: "genetics-1-5.pdf", category: "DNA Structure, Replication and Repair", expectedQuestions: 5 },
  { name: "genetics-2-6.pdf", category: "DNA Structure, Replication and Repair", expectedQuestions: 6 },
  // DNA Structure, Synthesis and Processing (6 total)
  { name: "genetics-3-6.pdf", category: "DNA Structure, Synthesis and Processing", expectedQuestions: 6 },
  // Gene Expression and Regulation (6 total)
  { name: "genetics-4-6.pdf", category: "Gene Expression and Regulation", expectedQuestions: 6 },
  // Clinical Genetics (20 total)
  { name: "genetics-5-7.pdf", category: "Clinical Genetics", expectedQuestions: 7 },
  { name: "genetics-6-7.pdf", category: "Clinical Genetics", expectedQuestions: 7 },
  { name: "genetics-7-5.pdf", category: "Clinical Genetics", expectedQuestions: 6 },
  // Miscellaneous (3 total)
  { name: "genetics-8-5.pdf", category: "Miscellaneous", expectedQuestions: 3 },
];

interface ProcessingResult {
  pdfName: string;
  status: "pending" | "rendering" | "uploading" | "extracting" | "success" | "error" | "paused";
  pagesRendered: number;
  totalPages: number;
  pagesUploaded: number;
  questionsExtracted: number;
  error?: string;
  uploadedPages?: { pageNumber: number; imageUrl: string }[];
  retryAttempt?: number;
  currentBatch?: number;
  totalBatches?: number;
}

interface SavedProgress {
  completedPdfs: string[];
  results: ProcessingResult[];
  lastUpdated: string;
}

export default function ProcessGeneticsPDFs() {
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPdf, setCurrentPdf] = useState("");
  const [overallProgress, setOverallProgress] = useState(0);
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [totalRetries, setTotalRetries] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const pdfjsLibRef = useRef<any>(null);
  const pauseRef = useRef(false);
  const abortRef = useRef(false);

  // Load PDF.js from CDN
  useEffect(() => {
    if (window.pdfjsLib) {
      pdfjsLibRef.current = window.pdfjsLib;
      setPdfLibLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      pdfjsLibRef.current = window.pdfjsLib;
      setPdfLibLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Check for saved progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: SavedProgress = JSON.parse(saved);
        if (parsed.completedPdfs && parsed.completedPdfs.length > 0) {
          setHasSavedProgress(true);
        }
      } catch (e) {
        console.error("Error parsing saved progress:", e);
      }
    }
  }, []);

  const saveProgress = useCallback((currentResults: ProcessingResult[], completedPdfs: string[]) => {
    const progress: SavedProgress = {
      completedPdfs,
      results: currentResults,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    setLastSaved(new Date());
  }, []);

  const loadSavedProgress = useCallback((): SavedProgress | null => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, []);

  const clearSavedProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedProgress(false);
  }, []);

  const updateResult = useCallback((pdfName: string, updates: Partial<ProcessingResult>) => {
    setResults(prev => {
      const newResults = prev.map(r => 
        r.pdfName === pdfName ? { ...r, ...updates } : r
      );
      return newResults;
    });
  }, []);

  // Faster parallel page rendering
  const renderPdfToImages = async (
    pdfUrl: string, 
    onProgress: (rendered: number, total: number) => void
  ): Promise<Blob[]> => {
    const pdfjsLib = pdfjsLibRef.current;
    if (!pdfjsLib) throw new Error("PDF.js not loaded");

    const response = await fetch(pdfUrl);
    const arrayBuffer = await response.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const totalPages = pdf.numPages;
    const scale = 2.0;
    const images: Blob[] = new Array(totalPages);
    let rendered = 0;

    // Process pages in parallel batches of 3
    const batchSize = 3;
    for (let i = 0; i < totalPages; i += batchSize) {
      if (pauseRef.current || abortRef.current) break;
      
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, totalPages); j++) {
        batch.push(
          (async (pageNum: number) => {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d")!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            
            const blob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((b) => resolve(b!), "image/png", 0.9);
            });
            
            images[pageNum - 1] = blob;
            rendered++;
            onProgress(rendered, totalPages);
          })(j + 1)
        );
      }
      await Promise.all(batch);
    }

    return images.filter(Boolean);
  };

  // Parallel uploads
  const uploadPageImages = async (
    pdfName: string, 
    images: Blob[],
    onProgress: (uploaded: number) => void
  ): Promise<{ pageNumber: number; imageUrl: string }[]> => {
    const uploadedPages: { pageNumber: number; imageUrl: string }[] = [];
    const baseName = pdfName.replace(".pdf", "");
    let uploaded = 0;

    // Upload in parallel batches of 5
    const batchSize = 5;
    for (let i = 0; i < images.length; i += batchSize) {
      if (pauseRef.current || abortRef.current) break;

      const batch = images.slice(i, i + batchSize).map(async (image, idx) => {
        const pageNum = i + idx + 1;
        const fileName = `${baseName}/page-${pageNum}.png`;
        
        const { error } = await supabase.storage
          .from("question-images")
          .upload(fileName, image, {
            contentType: "image/png",
            upsert: true,
          });

        if (error) {
          console.error(`Error uploading page ${pageNum}:`, error);
          return null;
        }

        const { data: urlData } = supabase.storage
          .from("question-images")
          .getPublicUrl(fileName);

        uploaded++;
        onProgress(uploaded);

        return {
          pageNumber: pageNum,
          imageUrl: urlData.publicUrl,
        };
      });

      const results = await Promise.all(batch);
      uploadedPages.push(...results.filter(Boolean) as { pageNumber: number; imageUrl: string }[]);
    }

    return uploadedPages;
  };

  const processSinglePdf = async (config: PDFConfig): Promise<number> => {
    const pdfUrl = `${GITHUB_RAW_BASE}/${config.name}`;
    
    try {
      // Step 1: Render PDF pages to images
      updateResult(config.name, { status: "rendering", pagesRendered: 0 });
      const images = await renderPdfToImages(pdfUrl, (rendered, total) => {
        updateResult(config.name, { pagesRendered: rendered, totalPages: total });
      });

      if (pauseRef.current || abortRef.current) {
        updateResult(config.name, { status: "paused" });
        return 0;
      }

      // Step 2: Upload images to storage
      updateResult(config.name, { status: "uploading", pagesUploaded: 0 });
      const uploadedPages = await uploadPageImages(config.name, images, (uploaded) => {
        updateResult(config.name, { pagesUploaded: uploaded });
      });

      if (pauseRef.current || abortRef.current) {
        updateResult(config.name, { status: "paused", uploadedPages });
        return 0;
      }

      // Step 3: Process in batches for better reliability
      const BATCH_SIZE = 10; // Process 10 pages at a time for AI
      const totalBatches = Math.ceil(uploadedPages.length / BATCH_SIZE);
      let allQuestions = 0;

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        if (pauseRef.current || abortRef.current) {
          updateResult(config.name, { status: "paused", uploadedPages });
          return 0;
        }

        const batchStart = batchIdx * BATCH_SIZE;
        const batchPages = uploadedPages.slice(batchStart, batchStart + BATCH_SIZE);
        
        updateResult(config.name, { 
          status: "extracting",
          currentBatch: batchIdx + 1,
          totalBatches,
          retryAttempt: 1
        });

        // Retry logic with smaller batch on failure
        let retryBatchSize = BATCH_SIZE;
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;

        while (!success && attempts < maxAttempts) {
          attempts++;
          if (attempts > 1) {
            setTotalRetries(prev => prev + 1);
          }
          updateResult(config.name, { retryAttempt: attempts });

          try {
            const { data, error } = await supabase.functions.invoke("extract-questions-from-pages", {
              body: {
                pageImages: batchPages,
                pdfName: config.name,
                category: config.category,
                subject: "Genetics",
                system: "General",
                batchSize: retryBatchSize,
              },
            });

            if (error) throw error;

            if (data.success) {
              allQuestions += data.questionsInserted;
              success = true;
            } else {
              throw new Error(data.error || "Unknown error");
            }
          } catch (error) {
            console.error(`Batch ${batchIdx + 1} attempt ${attempts} failed:`, error);
            if (attempts < maxAttempts) {
              // Wait with exponential backoff
              const waitTime = Math.pow(2, attempts) * 2000;
              console.log(`Waiting ${waitTime}ms before retry...`);
              await new Promise(r => setTimeout(r, waitTime));
              // Reduce batch size on retry
              retryBatchSize = Math.max(5, Math.floor(retryBatchSize / 2));
            } else {
              throw error;
            }
          }
        }
      }

      updateResult(config.name, { 
        status: "success", 
        questionsExtracted: allQuestions,
        currentBatch: undefined,
        totalBatches: undefined,
        retryAttempt: undefined
      });
      return allQuestions;
    } catch (error) {
      console.error(`Error processing ${config.name}:`, error);
      updateResult(config.name, { 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
      return 0;
    }
  };

  const clearExistingData = async () => {
    try {
      const { data: geneticsQuestions } = await supabase
        .from("questions")
        .select("id")
        .eq("subject", "Genetics");

      if (geneticsQuestions && geneticsQuestions.length > 0) {
        const questionIds = geneticsQuestions.map(q => q.id);

        await supabase.from("question_images").delete().in("question_id", questionIds);
        await supabase.from("question_options").delete().in("question_id", questionIds);
        await supabase.from("questions").delete().in("id", questionIds);
      }

      toast.success("Cleared existing genetics data");
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  };

  const processAllPdfs = async (resumeFrom?: number) => {
    setIsProcessing(true);
    setIsPaused(false);
    pauseRef.current = false;
    abortRef.current = false;

    const startIndex = resumeFrom || 0;

    // Initialize results if starting fresh
    if (startIndex === 0) {
      setResults(GENETICS_PDFS.map(pdf => ({
        pdfName: pdf.name,
        status: "pending",
        pagesRendered: 0,
        totalPages: 0,
        pagesUploaded: 0,
        questionsExtracted: 0,
      })));
      await clearExistingData();
    }

    setOverallProgress((startIndex / GENETICS_PDFS.length) * 100);

    const completedPdfs: string[] = [];
    let totalExtracted = 0;

    for (let i = startIndex; i < GENETICS_PDFS.length; i++) {
      if (abortRef.current) break;
      
      while (pauseRef.current) {
        // Save progress while paused
        saveProgress(results, completedPdfs);
        await new Promise(r => setTimeout(r, 500));
        if (abortRef.current) break;
      }

      const pdf = GENETICS_PDFS[i];
      setCurrentPdf(pdf.name);
      
      const extracted = await processSinglePdf(pdf);
      totalExtracted += extracted;
      
      completedPdfs.push(pdf.name);
      saveProgress(results, completedPdfs);
      
      setOverallProgress(((i + 1) / GENETICS_PDFS.length) * 100);
    }

    setIsProcessing(false);
    setCurrentPdf("");
    
    if (!abortRef.current) {
      clearSavedProgress();
      toast.success(`Processing complete! Extracted ${totalExtracted} questions from ${GENETICS_PDFS.length} PDFs`);
    }
  };

  const resumeProcessing = () => {
    const saved = loadSavedProgress();
    if (saved) {
      setResults(saved.results);
      const startIndex = saved.completedPdfs.length;
      processAllPdfs(startIndex);
    }
  };

  const togglePause = () => {
    if (isPaused) {
      pauseRef.current = false;
      setIsPaused(false);
    } else {
      pauseRef.current = true;
      setIsPaused(true);
      toast.info("Processing paused. Progress saved.");
    }
  };

  const getStatusIcon = (status: ProcessingResult["status"]) => {
    switch (status) {
      case "pending": return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "rendering": return <Image className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "uploading": return <Upload className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case "extracting": return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
      case "paused": return <Pause className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (result: ProcessingResult) => {
    switch (result.status) {
      case "pending": return "Waiting...";
      case "rendering": return `Rendering (${result.pagesRendered}/${result.totalPages || "?"})`;
      case "uploading": return `Uploading (${result.pagesUploaded}/${result.totalPages})`;
      case "extracting": {
        let text = "AI extracting";
        if (result.currentBatch && result.totalBatches) {
          text += ` (batch ${result.currentBatch}/${result.totalBatches})`;
        }
        if (result.retryAttempt && result.retryAttempt > 1) {
          text += ` [retry ${result.retryAttempt}/3]`;
        }
        return text + "...";
      }
      case "success": return `✓ ${result.questionsExtracted} questions`;
      case "error": return `Error: ${result.error}`;
      case "paused": return "Paused";
    }
  };

  const groupedPdfs = GENETICS_PDFS.reduce((acc, pdf) => {
    if (!acc[pdf.category]) acc[pdf.category] = [];
    acc[pdf.category].push(pdf);
    return acc;
  }, {} as Record<string, PDFConfig[]>);

  const completedCount = results.filter(r => r.status === "success").length;
  const totalQuestions = results.reduce((sum, r) => sum + r.questionsExtracted, 0);

  return (
    <AppLayout title="Process Genetics PDFs">
      <div className="container mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Process Genetics PDFs with Screenshot Capture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Fast parallel processing with auto-save. Each question gets 1+ diagram screenshots
              and 2-4 explanation screenshots. Progress saves automatically for offline resume.
            </p>

            <div className="flex flex-wrap gap-4">
              {!isProcessing && !hasSavedProgress && (
                <Button 
                  onClick={() => processAllPdfs(0)} 
                  disabled={!pdfLibLoaded}
                  size="lg"
                >
                  {!pdfLibLoaded ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading PDF.js...</>
                  ) : (
                    <><Play className="mr-2 h-4 w-4" />Start Processing</>
                  )}
                </Button>
              )}

              {!isProcessing && hasSavedProgress && (
                <>
                  <Button onClick={resumeProcessing} size="lg" variant="default">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resume Processing
                  </Button>
                  <Button onClick={() => { clearSavedProgress(); processAllPdfs(0); }} size="lg" variant="outline">
                    <Play className="mr-2 h-4 w-4" />
                    Start Fresh
                  </Button>
                </>
              )}

              {isProcessing && (
                <>
                  <Button onClick={togglePause} size="lg" variant={isPaused ? "default" : "outline"}>
                    {isPaused ? (
                      <><Play className="mr-2 h-4 w-4" />Resume</>
                    ) : (
                      <><Pause className="mr-2 h-4 w-4" />Pause</>
                    )}
                  </Button>
                  <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                    <Save className="h-4 w-4" />
                    {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Auto-saving..."}
                  </Badge>
                  {totalRetries > 0 && (
                    <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
                      <RefreshCw className="h-4 w-4" />
                      {totalRetries} retries
                    </Badge>
                  )}
                </>
              )}
            </div>

            {(isProcessing || results.length > 0) && (
              <div className="space-y-2">
                <Progress value={overallProgress} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {isProcessing ? `Processing: ${currentPdf}` : "Complete"}
                    {isPaused && " (Paused)"}
                  </span>
                  <span>{completedCount}/{GENETICS_PDFS.length} PDFs • {totalQuestions} questions</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(groupedPdfs).map(([category, pdfs]) => {
            const categoryResults = results.filter(r => 
              pdfs.some(p => p.name === r.pdfName)
            );
            const categoryQuestions = categoryResults.reduce((sum, r) => sum + r.questionsExtracted, 0);
            const expected = pdfs.reduce((sum, p) => sum + p.expectedQuestions, 0);
            
            return (
              <Card key={category} className="p-4">
                <p className="font-medium text-xs truncate">{category}</p>
                <p className="text-2xl font-bold">{categoryQuestions}/{expected}</p>
                <p className="text-xs text-muted-foreground">{pdfs.length} PDFs</p>
              </Card>
            );
          })}
        </div>

        {/* Processing Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Processing Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-4">
                  {Object.entries(groupedPdfs).map(([category, pdfs]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">{category}</h3>
                      {pdfs.map(pdf => {
                        const result = results.find(r => r.pdfName === pdf.name);
                        if (!result) return null;

                        return (
                          <div 
                            key={pdf.name}
                            className="p-3 rounded-lg border space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(result.status)}
                                <span className="font-medium text-sm">{pdf.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {pdf.expectedQuestions}Q
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {getStatusText(result)}
                              </span>
                            </div>
                            {/* Batch progress bar */}
                            {result.status === "extracting" && result.currentBatch && result.totalBatches && (
                              <div className="space-y-1">
                                <Progress 
                                  value={(result.currentBatch / result.totalBatches) * 100} 
                                  className="h-1.5" 
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Batch {result.currentBatch}/{result.totalBatches}</span>
                                  {result.retryAttempt && result.retryAttempt > 1 && (
                                    <span className="text-yellow-500">Retry {result.retryAttempt}/3</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Workflow Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What This Does</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Renders PDF pages as high-res PNGs (parallel batches)</li>
              <li>Uploads to storage with parallel batch uploads</li>
              <li>AI extracts questions, identifies diagram pages vs text</li>
              <li>Each question: 1+ diagram screenshot, 2-4 explanation screenshots</li>
              <li>Auto-saves progress - resume anytime even after closing browser</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
