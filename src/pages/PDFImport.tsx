import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, Info, Image } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

interface PDFFile {
  name: string;
  file: File;
  size?: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  questionsImported?: number;
  imagesFound?: number;
  error?: string;
  subject: string;
  system: string;
}

interface ImportProgress {
  status: 'idle' | 'extracting' | 'parsing' | 'importing' | 'complete' | 'error';
  currentStep: string;
  questionsFound: number;
  questionsImported: number;
  duplicatesSkipped: number;
  message: string;
  percent: number;
}

interface BulkProgress {
  totalFiles: number;
  currentFileIndex: number;
  currentFileName: string;
  overallPercent: number;
  totalQuestionsImported: number;
  totalDuplicatesSkipped: number;
}

interface ExtractedQuestion {
  question_text: string;
  options: { letter: string; text: string; is_correct: boolean; explanation?: string }[];
  explanation: string;
  category?: string;
  subject?: string;
  system?: string;
  has_image?: boolean;
  image_description?: string;
  image_type?: string;
  medical_content?: string;
}

interface HistoryItem {
  pdf: string;
  count: number;
  date: string;
}

// Memoized history row component
const HistoryRow = memo(({ item }: { item: HistoryItem }) => (
  <div className="flex items-center justify-between p-3 border rounded-lg">
    <div className="flex items-center gap-2">
      <CheckCircle className="h-4 w-4 text-[hsl(var(--badge-success))]" />
      <div>
        <p className="font-medium text-sm truncate max-w-32">{item.pdf}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(item.date).toLocaleDateString()}
        </p>
      </div>
    </div>
    <Badge variant="secondary">{item.count} Q</Badge>
  </div>
));
HistoryRow.displayName = 'HistoryRow';

const PDFImport = () => {
  const [availablePDFs, setAvailablePDFs] = useState<PDFFile[]>([]);
  const [defaultSubject, setDefaultSubject] = useState<string>("");
  const [defaultSystem, setDefaultSystem] = useState<string>("");
  const [extractImages, setExtractImages] = useState<boolean>(true);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    currentStep: '',
    questionsFound: 0,
    questionsImported: 0,
    duplicatesSkipped: 0,
    message: '',
    percent: 0
  });
  const [bulkProgress, setBulkProgress] = useState<BulkProgress>({
    totalFiles: 0,
    currentFileIndex: 0,
    currentFileName: '',
    overallPercent: 0,
    totalQuestionsImported: 0,
    totalDuplicatesSkipped: 0
  });
  const [importHistory, setImportHistory] = useState<HistoryItem[]>([]);
  const [displayCount, setDisplayCount] = useState(10);
  const [existingHashes, setExistingHashes] = useState<Set<string>>(new Set());
  
  const historyContainerRef = useRef<HTMLDivElement>(null);

  const subjects = [
    "Biochemistry", "Immunology", "Microbiology", "Pathology",
    "Pharmacology", "Physiology", "Anatomy", "Behavioral Science",
    "Behavioral Science & Psychiatry"
  ];

  const systems = [
    "Cell Biology", "Molecular Biology", "Genetics", "Metabolism",
    "Cardiovascular", "Respiratory", "Renal", "Gastrointestinal",
    "Endocrine", "Reproductive", "Musculoskeletal", "Nervous System",
    "Hematology", "Immune System", "General Principles"
  ];

  useEffect(() => {
    loadImportHistory();
    loadExistingHashes();
  }, []);

  const loadImportHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('source_pdf, created_at')
        .not('source_pdf', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const grouped = (data || []).reduce((acc, q) => {
        if (q.source_pdf) {
          if (!acc[q.source_pdf]) {
            acc[q.source_pdf] = { count: 0, date: q.created_at };
          }
          acc[q.source_pdf].count++;
        }
        return acc;
      }, {} as Record<string, { count: number; date: string }>);

      setImportHistory(
        Object.entries(grouped).map(([pdf, info]) => ({
          pdf,
          count: info.count,
          date: info.date
        }))
      );
    } catch (error) {
      console.error("Error loading import history:", error);
    }
  };

  const loadExistingHashes = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('question_hash')
        .not('question_hash', 'is', null)
        .limit(10000);

      if (error) throw error;

      const hashes = new Set((data || []).map(q => q.question_hash).filter(Boolean) as string[]);
      setExistingHashes(hashes);
    } catch (error) {
      console.error("Error loading existing hashes:", error);
    }
  };

  const generateQuestionHash = useCallback((questionText: string): string => {
    const normalized = questionText.toLowerCase().replace(/\s+/g, ' ').trim();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const pdfFiles: PDFFile[] = Array.from(files)
        .filter(file => file.type === 'application/pdf')
        .map(file => ({
          name: file.name,
          file: file,
          size: file.size,
          status: 'pending' as const,
          subject: defaultSubject,
          system: defaultSystem
        }));
      
      setAvailablePDFs(prev => [...prev, ...pdfFiles]);
      toast.success(`Added ${pdfFiles.length} PDF(s) to the queue`);
    }
  };

  const removePDF = (index: number) => {
    setAvailablePDFs(prev => prev.filter((_, i) => i !== index));
  };

  const updatePDFSubject = (index: number, subject: string) => {
    setAvailablePDFs(prev => prev.map((p, i) => i === index ? { ...p, subject } : p));
  };

  const updatePDFSystem = (index: number, system: string) => {
    setAvailablePDFs(prev => prev.map((p, i) => i === index ? { ...p, system } : p));
  };

  const applyDefaultsToAll = () => {
    setAvailablePDFs(prev => prev.map(p => 
      p.status === 'pending' ? { ...p, subject: defaultSubject, system: defaultSystem } : p
    ));
    toast.success("Applied defaults to all pending PDFs");
  };

  const extractTextFromPDF = async (file: File): Promise<{ text: string; base64: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          
          // Convert to base64 for image extraction
          let base64 = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            base64 += String.fromCharCode.apply(null, Array.from(chunk));
          }
          base64 = btoa(base64);
          
          // Extract text from PDF binary (simple extraction)
          let text = '';
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const rawText = decoder.decode(bytes);
          
          // Find text content between stream markers and decode
          const streamMatches = rawText.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g);
          if (streamMatches) {
            for (const match of streamMatches) {
              const content = match.replace(/stream[\r\n]+/, '').replace(/[\r\n]+endstream/, '');
              const readable = content.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ');
              if (readable.length > 50) {
                text += readable + '\n';
              }
            }
          }
          
          // Also try to find text between parentheses (PDF text objects)
          const textObjects = rawText.match(/\(([^)]+)\)/g);
          if (textObjects) {
            for (const obj of textObjects) {
              const content = obj.slice(1, -1);
              if (content.length > 2 && /[a-zA-Z]/.test(content)) {
                text += content + ' ';
              }
            }
          }

          // Clean up
          text = text
            .replace(/CamScanner/gi, '')
            .replace(/CS\s*CamScanner/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

          if (text.length < 100) {
            text = rawText.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ').substring(0, 50000);
          }

          resolve({ text, base64 });
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Process a single PDF and return results
  const processOnePDF = async (pdf: PDFFile): Promise<{ imported: number; skipped: number; imagesFound: number }> => {
    // Extract text and base64
    const { text: pdfText, base64: pdfBase64 } = await extractTextFromPDF(pdf.file);
    
    if (pdfText.length < 50) {
      throw new Error('Could not extract enough text from PDF. The file may be image-based.');
    }

    setProgress(prev => ({
      ...prev,
      status: 'parsing',
      currentStep: extractImages ? 'AI is analyzing questions and images...' : 'AI is analyzing questions...',
      message: `Extracted ${pdfText.length} characters. Sending to AI...`,
      percent: 30
    }));

    // Call edge function - use per-PDF subject/system
    const { data: aiResult, error: aiError } = await supabase.functions.invoke('parse-pdf-questions', {
      body: {
        pdfText: pdfText.substring(0, 100000),
        pdfBase64: extractImages ? pdfBase64 : undefined,
        pdfFileName: pdf.name,
        subject: pdf.subject,
        system: pdf.system,
        extractImages
      }
    });

    if (aiError) throw aiError;
    if (!aiResult?.success) {
      throw new Error(aiResult?.error || 'Failed to parse questions');
    }

    const questions: ExtractedQuestion[] = aiResult.questions || [];
    const imagesFound = aiResult.imagesFound || 0;
    
    setProgress(prev => ({
      ...prev,
      status: 'importing',
      currentStep: 'Importing to database...',
      questionsFound: questions.length,
      message: `Found ${questions.length} questions${imagesFound > 0 ? ` and ${imagesFound} images` : ''}...`,
      percent: 50
    }));

    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const hash = generateQuestionHash(q.question_text);

      if (existingHashes.has(hash)) {
        skipped++;
        continue;
      }

      try {
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .insert({
            question_text: q.question_text,
            subject: pdf.subject,
            system: q.system || pdf.system,
            difficulty: 'medium',
            explanation: q.explanation || '',
            question_hash: hash,
            source_pdf: pdf.name,
            category: q.category || pdf.system,
            has_image: q.has_image || false,
            image_description: q.image_description || null
          })
          .select()
          .single();

        if (questionError) continue;

        if (q.options && q.options.length > 0) {
          await supabase.from('question_options').insert(
            q.options.map(opt => ({
              question_id: questionData.id,
              option_letter: opt.letter,
              option_text: opt.text,
              is_correct: opt.is_correct,
              explanation: opt.explanation || null
            }))
          );
        }

        imported++;
        existingHashes.add(hash);
      } catch (insertError) {
        console.error('Insert error:', insertError);
      }

      setProgress(prev => ({
        ...prev,
        questionsImported: imported,
        duplicatesSkipped: skipped,
        percent: 50 + Math.round((i / questions.length) * 50)
      }));
    }

    return { imported, skipped, imagesFound };
  };

  // Bulk import all pending PDFs sequentially
  const handleBulkImport = async () => {
    const pendingPDFs = availablePDFs.filter(p => p.status === 'pending');
    if (pendingPDFs.length === 0) {
      toast.error("No PDFs in queue to import");
      return;
    }

    // Check that all pending PDFs have subject and system set
    const incomplete = pendingPDFs.filter(p => !p.subject || !p.system);
    if (incomplete.length > 0) {
      toast.error(`${incomplete.length} PDF(s) are missing subject or system`);
      return;
    }

    setIsBulkProcessing(true);
    setBulkProgress({
      totalFiles: pendingPDFs.length,
      currentFileIndex: 0,
      currentFileName: '',
      overallPercent: 0,
      totalQuestionsImported: 0,
      totalDuplicatesSkipped: 0
    });

    let totalImported = 0;
    let totalSkipped = 0;

    for (let i = 0; i < availablePDFs.length; i++) {
      const pdf = availablePDFs[i];
      if (pdf.status !== 'pending') continue;

      setBulkProgress(prev => ({
        ...prev,
        currentFileIndex: prev.currentFileIndex + 1,
        currentFileName: pdf.name,
        overallPercent: Math.round((prev.currentFileIndex / prev.totalFiles) * 100)
      }));

      setProgress({
        status: 'extracting',
        currentStep: 'Extracting text...',
        questionsFound: 0,
        questionsImported: 0,
        duplicatesSkipped: 0,
        message: `Processing ${pdf.name}...`,
        percent: 10
      });

      // Update PDF status
      setAvailablePDFs(prev => prev.map((p, idx) => 
        idx === i ? { ...p, status: 'processing' as const } : p
      ));

      try {
        const { imported, skipped, imagesFound } = await processOnePDF(pdf);
        totalImported += imported;
        totalSkipped += skipped;

        setAvailablePDFs(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'complete' as const, questionsImported: imported, imagesFound } : p
        ));

        setBulkProgress(prev => ({
          ...prev,
          totalQuestionsImported: totalImported,
          totalDuplicatesSkipped: totalSkipped
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setAvailablePDFs(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'error' as const, error: errorMessage } : p
        ));
      }
    }

    setIsBulkProcessing(false);
    setBulkProgress(prev => ({ ...prev, overallPercent: 100 }));
    setProgress({
      status: 'complete',
      currentStep: 'All imports complete!',
      questionsFound: 0,
      questionsImported: totalImported,
      duplicatesSkipped: totalSkipped,
      message: `Imported ${totalImported} questions from ${pendingPDFs.length} PDFs.`,
      percent: 100
    });

    toast.success(`Bulk import complete! ${totalImported} questions added.`);
    loadImportHistory();
  };

  const resetImport = () => {
    setProgress({
      status: 'idle',
      currentStep: '',
      questionsFound: 0,
      questionsImported: 0,
      duplicatesSkipped: 0,
      message: '',
      percent: 0
    });
    setBulkProgress({
      totalFiles: 0,
      currentFileIndex: 0,
      currentFileName: '',
      overallPercent: 0,
      totalQuestionsImported: 0,
      totalDuplicatesSkipped: 0
    });
    setAvailablePDFs(prev => prev.map(p => ({ ...p, status: 'pending' as const, error: undefined })));
  };

  const clearQueue = () => {
    setAvailablePDFs([]);
    resetImport();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Virtualized history list
  const virtualizer = useVirtualizer({
    count: Math.min(importHistory.length, displayCount),
    getScrollElement: () => historyContainerRef.current,
    estimateSize: () => 64,
    overscan: 5
  });

  const visibleHistory = useMemo(() => 
    importHistory.slice(0, displayCount), 
    [importHistory, displayCount]
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PDF Import</h1>
          <p className="text-muted-foreground">
            Upload PDFs - AI extracts questions, dedupes, and imports to QBank
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & Selection Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload & Select PDF
            </CardTitle>
            <CardDescription>
              Upload PDF files - AI will extract questions automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileText className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload PDF files or drag and drop
                </span>
                <Button variant="outline" size="sm" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>

            {/* PDF Queue with Per-PDF Settings */}
            {availablePDFs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">PDF Queue ({availablePDFs.length} files)</label>
                  <Button variant="ghost" size="sm" onClick={clearQueue} disabled={isBulkProcessing}>
                    Clear All
                  </Button>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {availablePDFs.map((pdf, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        pdf.status === 'complete' ? 'border-green-500/50 bg-green-500/5' :
                        pdf.status === 'error' ? 'border-destructive/50 bg-destructive/5' :
                        pdf.status === 'processing' ? 'border-primary bg-primary/5' :
                        (!pdf.subject || !pdf.system) ? 'border-orange-500/50 bg-orange-500/5' :
                        'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {pdf.status === 'complete' ? (
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          ) : pdf.status === 'error' ? (
                            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                          ) : pdf.status === 'processing' ? (
                            <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-sm truncate max-w-[200px]">{pdf.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {pdf.status === 'complete' ? `${pdf.questionsImported} questions imported` :
                               pdf.status === 'error' ? pdf.error :
                               formatFileSize(pdf.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pdf.status === 'pending' && !isBulkProcessing && (
                            <Button variant="ghost" size="sm" onClick={() => removePDF(index)}>
                              Remove
                            </Button>
                          )}
                          {pdf.status === 'complete' && (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600">Done</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Per-PDF Subject & System */}
                      {pdf.status === 'pending' && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <Select 
                            value={pdf.subject} 
                            onValueChange={(val) => updatePDFSubject(index, val)}
                            disabled={isBulkProcessing}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map(subject => (
                                <SelectItem key={subject} value={subject} className="text-xs">
                                  {subject}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={pdf.system} 
                            onValueChange={(val) => updatePDFSystem(index, val)}
                            disabled={isBulkProcessing}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="System" />
                            </SelectTrigger>
                            <SelectContent>
                              {systems.map(system => (
                                <SelectItem key={system} value={system} className="text-xs">
                                  {system}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Default Subject & System + Apply to All */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <p className="text-sm font-medium">Set defaults for new uploads</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Default Subject</label>
                  <Select value={defaultSubject} onValueChange={setDefaultSubject} disabled={isBulkProcessing}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Default System</label>
                  <Select value={defaultSystem} onValueChange={setDefaultSystem} disabled={isBulkProcessing}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select system" />
                    </SelectTrigger>
                    <SelectContent>
                      {systems.map(system => (
                        <SelectItem key={system} value={system}>
                          {system}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {availablePDFs.filter(p => p.status === 'pending').length > 0 && defaultSubject && defaultSystem && (
                <Button variant="outline" size="sm" onClick={applyDefaultsToAll} disabled={isBulkProcessing}>
                  Apply to all pending PDFs
                </Button>
              )}
            </div>

            {/* Extract Images Toggle */}
            <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Image className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="extract-images" className="text-sm font-medium">
                    Extract Images from PDFs
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use AI vision to detect and describe diagrams in explanations
                  </p>
                </div>
              </div>
              <Switch
                id="extract-images"
                checked={extractImages}
                onCheckedChange={setExtractImages}
                disabled={isBulkProcessing}
              />
            </div>

            {/* Bulk Import Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleBulkImport}
                disabled={
                  availablePDFs.filter(p => p.status === 'pending').length === 0 || 
                  availablePDFs.some(p => p.status === 'pending' && (!p.subject || !p.system)) ||
                  isBulkProcessing
                }
                className="flex-1"
              >
                {isBulkProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing {bulkProgress.currentFileIndex}/{bulkProgress.totalFiles}...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import All PDFs ({availablePDFs.filter(p => p.status === 'pending').length})
                  </>
                )}
              </Button>
              {(progress.status !== 'idle' || isBulkProcessing) && (
                <Button variant="outline" onClick={resetImport} disabled={isBulkProcessing}>
                  Reset
                </Button>
              )}
            </div>

            {/* Bulk Progress */}
            {isBulkProcessing && (
              <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Overall Progress</span>
                  <Badge variant="secondary">
                    {bulkProgress.currentFileIndex}/{bulkProgress.totalFiles} files
                  </Badge>
                </div>
                <Progress value={bulkProgress.overallPercent} />
                <p className="text-xs text-muted-foreground">
                  Currently processing: {bulkProgress.currentFileName}
                </p>
              </div>
            )}

            {/* Progress Display */}
            {progress.status !== 'idle' && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{progress.message}</span>
                  <Badge variant={progress.status === 'complete' ? 'default' : progress.status === 'error' ? 'destructive' : 'secondary'}>
                    {progress.status === 'complete' ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Complete</>
                    ) : progress.status === 'error' ? (
                      <><AlertCircle className="h-3 w-3 mr-1" /> Error</>
                    ) : (
                      progress.currentStep
                    )}
                  </Badge>
                </div>
                <Progress value={progress.percent} />
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground">Found</p>
                    <p className="font-semibold">{progress.questionsFound}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Imported</p>
                    <p className="font-semibold text-[hsl(var(--badge-success))]">{progress.questionsImported}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duplicates</p>
                    <p className="font-semibold text-orange-600">{progress.duplicatesSkipped}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import History Panel - Virtualized */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Import History
            </CardTitle>
            <CardDescription>
              Previously imported PDFs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {importHistory.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No PDFs have been imported yet. Upload a PDF and start importing!
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div 
                  ref={historyContainerRef}
                  className="h-[300px] overflow-y-auto space-y-2"
                >
                  {visibleHistory.map((item, index) => (
                    <HistoryRow key={`${item.pdf}-${index}`} item={item} />
                  ))}
                </div>
                {importHistory.length > displayCount && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setDisplayCount(prev => prev + 10)}
                  >
                    Load More ({importHistory.length - displayCount} remaining)
                  </Button>
                )}
              </>
            )}

            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">AI-Powered Import</p>
                <p className="text-xs">
                  Questions are extracted using AI, hashed for duplicate detection, 
                  and automatically categorized before import.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDFImport;
