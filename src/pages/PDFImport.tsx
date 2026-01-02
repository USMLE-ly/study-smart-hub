import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

interface PDFFile {
  name: string;
  file: File;
  size?: number;
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

interface ExtractedQuestion {
  question_text: string;
  options: { letter: string; text: string; is_correct: boolean; explanation?: string }[];
  explanation: string;
  category?: string;
  subject?: string;
  system?: string;
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
  const [selectedPDFIndex, setSelectedPDFIndex] = useState<number>(-1);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    currentStep: '',
    questionsFound: 0,
    questionsImported: 0,
    duplicatesSkipped: 0,
    message: '',
    percent: 0
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
          size: file.size
        }));
      
      setAvailablePDFs(prev => [...prev, ...pdfFiles]);
      toast.success(`Added ${pdfFiles.length} PDF(s) to the queue`);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // Use FileReader to get the file content as ArrayBuffer
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          
          // Extract text from PDF binary (simple extraction)
          let text = '';
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const rawText = decoder.decode(bytes);
          
          // Find text content between stream markers and decode
          const streamMatches = rawText.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g);
          if (streamMatches) {
            for (const match of streamMatches) {
              // Try to extract readable text
              const content = match.replace(/stream[\r\n]+/, '').replace(/[\r\n]+endstream/, '');
              // Filter for printable ASCII and common characters
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
            // If simple extraction fails, we'll send raw content to AI
            text = rawText.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ').substring(0, 50000);
          }

          resolve(text);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (selectedPDFIndex < 0 || !selectedSubject || !selectedSystem) {
      toast.error("Please select a PDF, subject, and system before importing");
      return;
    }

    const selectedPDF = availablePDFs[selectedPDFIndex];
    if (!selectedPDF) return;

    setProgress({
      status: 'extracting',
      currentStep: 'Extracting text from PDF...',
      questionsFound: 0,
      questionsImported: 0,
      duplicatesSkipped: 0,
      message: 'Reading PDF file...',
      percent: 10
    });

    try {
      // Step 1: Extract text from PDF
      const pdfText = await extractTextFromPDF(selectedPDF.file);
      
      if (pdfText.length < 50) {
        throw new Error('Could not extract enough text from PDF. The file may be image-based.');
      }

      setProgress(prev => ({
        ...prev,
        status: 'parsing',
        currentStep: 'AI is analyzing questions...',
        message: `Extracted ${pdfText.length} characters. Sending to AI...`,
        percent: 30
      }));

      // Step 2: Call edge function to parse questions with AI
      const { data: aiResult, error: aiError } = await supabase.functions.invoke('parse-pdf-questions', {
        body: {
          pdfText: pdfText.substring(0, 100000), // Limit to 100k chars
          subject: selectedSubject,
          system: selectedSystem
        }
      });

      if (aiError) throw aiError;
      if (!aiResult?.success) {
        throw new Error(aiResult?.error || 'Failed to parse questions');
      }

      const questions: ExtractedQuestion[] = aiResult.questions || [];
      
      setProgress(prev => ({
        ...prev,
        status: 'importing',
        currentStep: 'Importing questions to database...',
        questionsFound: questions.length,
        message: `Found ${questions.length} questions. Checking for duplicates...`,
        percent: 50
      }));

      // Step 3: Import questions to database
      let imported = 0;
      let skipped = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const hash = generateQuestionHash(q.question_text);

        // Check for duplicate
        if (existingHashes.has(hash)) {
          skipped++;
          continue;
        }

        try {
          // Insert question
          const { data: questionData, error: questionError } = await supabase
            .from('questions')
            .insert({
              question_text: q.question_text,
              subject: selectedSubject,
              system: q.system || selectedSystem,
              difficulty: 'medium',
              explanation: q.explanation || '',
              question_hash: hash,
              source_pdf: selectedPDF.name
            })
            .select()
            .single();

          if (questionError) {
            console.error('Question insert error:', questionError);
            continue;
          }

          // Insert options
          if (q.options && q.options.length > 0) {
            const optionsToInsert = q.options.map(opt => ({
              question_id: questionData.id,
              option_letter: opt.letter,
              option_text: opt.text,
              is_correct: opt.is_correct,
              explanation: opt.explanation || null
            }));

            const { error: optionsError } = await supabase
              .from('question_options')
              .insert(optionsToInsert);

            if (optionsError) {
              console.error('Options insert error:', optionsError);
            }
          }

          imported++;
          existingHashes.add(hash);
        } catch (insertError) {
          console.error('Insert error:', insertError);
        }

        // Update progress
        setProgress(prev => ({
          ...prev,
          questionsImported: imported,
          duplicatesSkipped: skipped,
          percent: 50 + Math.round((i / questions.length) * 50),
          message: `Imported ${imported}/${questions.length} questions...`
        }));
      }

      setProgress({
        status: 'complete',
        currentStep: 'Import complete!',
        questionsFound: questions.length,
        questionsImported: imported,
        duplicatesSkipped: skipped,
        message: `Successfully imported ${imported} questions, skipped ${skipped} duplicates.`,
        percent: 100
      });

      toast.success(`Import complete! ${imported} questions added, ${skipped} duplicates skipped.`);
      loadImportHistory();

    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setProgress(prev => ({
        ...prev,
        status: 'error',
        currentStep: 'Import failed',
        message: errorMessage,
        percent: 0
      }));
      toast.error(`Import failed: ${errorMessage}`);
    }
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
    setSelectedPDFIndex(-1);
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

            {/* PDF List */}
            {availablePDFs.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Available PDFs</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availablePDFs.map((pdf, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        selectedPDFIndex === index ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{pdf.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(pdf.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={selectedPDFIndex === index ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPDFIndex(index)}
                      >
                        {selectedPDFIndex === index ? "Selected" : "Select"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subject & System Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
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
                <label className="text-sm font-medium">System</label>
                <Select value={selectedSystem} onValueChange={setSelectedSystem}>
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

            {/* Import Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={selectedPDFIndex < 0 || !selectedSubject || !selectedSystem || progress.status !== 'idle'}
                className="flex-1"
              >
                {progress.status !== 'idle' && progress.status !== 'complete' && progress.status !== 'error' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {progress.currentStep}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start AI Import
                  </>
                )}
              </Button>
              {progress.status !== 'idle' && (
                <Button variant="outline" onClick={resetImport}>
                  Reset
                </Button>
              )}
            </div>

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
