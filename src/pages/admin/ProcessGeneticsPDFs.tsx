import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, CheckCircle, XCircle, Loader2, Image, Upload } from "lucide-react";

// We'll load PDF.js dynamically from CDN to avoid top-level await issues
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/USMLE-ly/study-smart-hub/969ac5447c2b475b4fea7d5a2d9e94670508cc25/public/pdfs";

interface PDFConfig {
  name: string;
  category: string;
  expectedQuestions: number;
}

// Total: 63 questions
// DNA Structure, Replication and Repair: 19 questions
// DNA Structure, Synthesis and Processing: 13 questions
// Gene Expression and Regulation: 8 questions
// Clinical Genetics: 20 questions
// Miscellaneous: 3 questions

const GENETICS_PDFS: PDFConfig[] = [
  // DNA Structure, Replication and Repair (19 total)
  { name: "genetics-1-5.pdf", category: "DNA Structure, Replication and Repair", expectedQuestions: 5 },
  { name: "genetics-1-8.pdf", category: "DNA Structure, Replication and Repair", expectedQuestions: 8 },
  { name: "genetics-2-6.pdf", category: "DNA Structure, Replication and Repair", expectedQuestions: 6 },
  // DNA Structure, Synthesis and Processing (13 total)
  { name: "genetics-3-6.pdf", category: "DNA Structure, Synthesis and Processing", expectedQuestions: 6 },
  { name: "genetics-3-8.pdf", category: "DNA Structure, Synthesis and Processing", expectedQuestions: 7 },
  // Gene Expression and Regulation (8 total)
  { name: "genetics-4-6.pdf", category: "Gene Expression and Regulation", expectedQuestions: 6 },
  { name: "2.pdf", category: "Gene Expression and Regulation", expectedQuestions: 2 },
  // Clinical Genetics (20 total)
  { name: "genetics-5-7.pdf", category: "Clinical Genetics", expectedQuestions: 7 },
  { name: "genetics-6-7.pdf", category: "Clinical Genetics", expectedQuestions: 7 },
  { name: "genetics-7-5.pdf", category: "Clinical Genetics", expectedQuestions: 6 },
  // Miscellaneous (3 total)
  { name: "genetics-8-5.pdf", category: "Miscellaneous", expectedQuestions: 3 },
];

interface ProcessingResult {
  pdfName: string;
  status: "pending" | "rendering" | "uploading" | "extracting" | "success" | "error";
  pagesRendered: number;
  totalPages: number;
  pagesUploaded: number;
  questionsExtracted: number;
  error?: string;
}

export default function ProcessGeneticsPDFs() {
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPdf, setCurrentPdf] = useState("");
  const [overallProgress, setOverallProgress] = useState(0);
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  const pdfjsLibRef = useRef<any>(null);

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

  const updateResult = useCallback((pdfName: string, updates: Partial<ProcessingResult>) => {
    setResults(prev => prev.map(r => 
      r.pdfName === pdfName ? { ...r, ...updates } : r
    ));
  }, []);

  const renderPdfToImages = async (pdfUrl: string): Promise<Blob[]> => {
    const pdfjsLib = pdfjsLibRef.current;
    if (!pdfjsLib) throw new Error("PDF.js not loaded");

    const response = await fetch(pdfUrl);
    const arrayBuffer = await response.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const images: Blob[] = [];
    const scale = 2.0; // Higher quality

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png", 0.95);
      });
      
      images.push(blob);
    }

    return images;
  };

  const uploadPageImages = async (
    pdfName: string, 
    images: Blob[]
  ): Promise<{ pageNumber: number; imageUrl: string }[]> => {
    const uploadedPages: { pageNumber: number; imageUrl: string }[] = [];
    const baseName = pdfName.replace(".pdf", "");

    for (let i = 0; i < images.length; i++) {
      const pageNum = i + 1;
      const fileName = `${baseName}/page-${pageNum}.png`;
      
      const { data, error } = await supabase.storage
        .from("question-images")
        .upload(fileName, images[i], {
          contentType: "image/png",
          upsert: true,
        });

      if (error) {
        console.error(`Error uploading page ${pageNum}:`, error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("question-images")
        .getPublicUrl(fileName);

      uploadedPages.push({
        pageNumber: pageNum,
        imageUrl: urlData.publicUrl,
      });
    }

    return uploadedPages;
  };

  const processSinglePdf = async (config: PDFConfig) => {
    const pdfUrl = `${GITHUB_RAW_BASE}/${config.name}`;
    
    try {
      // Step 1: Render PDF pages to images
      updateResult(config.name, { status: "rendering", pagesRendered: 0 });
      const images = await renderPdfToImages(pdfUrl);
      updateResult(config.name, { 
        status: "rendering", 
        pagesRendered: images.length,
        totalPages: images.length 
      });

      // Step 2: Upload images to storage
      updateResult(config.name, { status: "uploading", pagesUploaded: 0 });
      const uploadedPages = await uploadPageImages(config.name, images);
      updateResult(config.name, { 
        status: "uploading", 
        pagesUploaded: uploadedPages.length 
      });

      // Step 3: Call edge function to extract questions
      updateResult(config.name, { status: "extracting" });
      
      const { data, error } = await supabase.functions.invoke("extract-questions-from-pages", {
        body: {
          pageImages: uploadedPages,
          pdfName: config.name,
          category: config.category,
          subject: "Genetics",
          system: "General",
        },
      });

      if (error) throw error;

      if (data.success) {
        updateResult(config.name, { 
          status: "success", 
          questionsExtracted: data.questionsInserted 
        });
        return data.questionsInserted;
      } else {
        throw new Error(data.error || "Unknown error");
      }
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
      // First get all genetics question IDs
      const { data: geneticsQuestions } = await supabase
        .from("questions")
        .select("id")
        .eq("subject", "Genetics");

      if (geneticsQuestions && geneticsQuestions.length > 0) {
        const questionIds = geneticsQuestions.map(q => q.id);

        // Delete related images
        await supabase
          .from("question_images")
          .delete()
          .in("question_id", questionIds);

        // Delete related options
        await supabase
          .from("question_options")
          .delete()
          .in("question_id", questionIds);

        // Delete questions
        await supabase
          .from("questions")
          .delete()
          .in("id", questionIds);
      }

      toast.success("Cleared existing genetics data");
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  };

  const processAllPdfs = async () => {
    setIsProcessing(true);
    setOverallProgress(0);

    // Initialize results
    setResults(GENETICS_PDFS.map(pdf => ({
      pdfName: pdf.name,
      status: "pending",
      pagesRendered: 0,
      totalPages: 0,
      pagesUploaded: 0,
      questionsExtracted: 0,
    })));

    // Clear existing data first
    await clearExistingData();

    let totalExtracted = 0;

    for (let i = 0; i < GENETICS_PDFS.length; i++) {
      const pdf = GENETICS_PDFS[i];
      setCurrentPdf(pdf.name);
      
      const extracted = await processSinglePdf(pdf);
      totalExtracted += extracted;
      
      setOverallProgress(((i + 1) / GENETICS_PDFS.length) * 100);
    }

    setIsProcessing(false);
    setCurrentPdf("");
    
    toast.success(`Processing complete! Extracted ${totalExtracted} questions from ${GENETICS_PDFS.length} PDFs`);
  };

  const getStatusIcon = (status: ProcessingResult["status"]) => {
    switch (status) {
      case "pending":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "rendering":
        return <Image className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "uploading":
        return <Upload className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case "extracting":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusText = (result: ProcessingResult) => {
    switch (result.status) {
      case "pending":
        return "Waiting...";
      case "rendering":
        return `Rendering pages (${result.pagesRendered}/${result.totalPages || "?"})`;
      case "uploading":
        return `Uploading (${result.pagesUploaded}/${result.totalPages})`;
      case "extracting":
        return "Extracting questions...";
      case "success":
        return `✓ ${result.questionsExtracted} questions`;
      case "error":
        return `Error: ${result.error}`;
    }
  };

  // Group PDFs by category
  const groupedPdfs = GENETICS_PDFS.reduce((acc, pdf) => {
    if (!acc[pdf.category]) acc[pdf.category] = [];
    acc[pdf.category].push(pdf);
    return acc;
  }, {} as Record<string, PDFConfig[]>);

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
              This tool renders each PDF page as a high-resolution image, uploads to storage,
              and extracts questions with their explanation screenshots in UWorld format.
            </p>

            <div className="flex gap-4">
              <Button 
                onClick={processAllPdfs} 
                disabled={isProcessing || !pdfLibLoaded}
                size="lg"
              >
                {!pdfLibLoaded ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading PDF.js...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing {currentPdf}...
                  </>
                ) : (
                  "Start Processing All PDFs"
                )}
              </Button>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={overallProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Overall progress: {Math.round(overallProgress)}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expected Questions Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expected Questions by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(groupedPdfs).map(([category, pdfs]) => (
                <div key={category} className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">{category}</p>
                  <p className="text-2xl font-bold">
                    {pdfs.reduce((sum, p) => sum + p.expectedQuestions, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pdfs.length} PDFs
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Processing Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Processing Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {Object.entries(groupedPdfs).map(([category, pdfs]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">
                        {category}
                      </h3>
                      {pdfs.map(pdf => {
                        const result = results.find(r => r.pdfName === pdf.name);
                        if (!result) return null;

                        return (
                          <div 
                            key={pdf.name}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              {getStatusIcon(result.status)}
                              <span className="font-medium">{pdf.name}</span>
                              <Badge variant="outline" className="text-xs">
                                Expected: {pdf.expectedQuestions}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {getStatusText(result)}
                            </span>
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

        {/* Workflow Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Processing Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Fetch PDF from GitHub repository</li>
              <li>Render each page as high-resolution PNG using pdf.js</li>
              <li>Upload page images to storage bucket</li>
              <li>Send page image URLs to AI for question extraction</li>
              <li>AI identifies question pages and explanation pages</li>
              <li>Store questions with linked page screenshots</li>
              <li>Each question gets 1+ question screenshots and 2-4 explanation screenshots</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
