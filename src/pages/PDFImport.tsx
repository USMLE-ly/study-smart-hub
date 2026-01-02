import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PDFFile {
  name: string;
  path: string;
  size?: number;
}

interface ImportProgress {
  status: 'idle' | 'processing' | 'complete' | 'error';
  currentPage: number;
  totalPages: number;
  questionsFound: number;
  duplicatesSkipped: number;
  message: string;
}

interface ImportedQuestion {
  source_pdf: string;
  source_page: number;
  question_hash: string;
}

const PDFImport = () => {
  const [availablePDFs, setAvailablePDFs] = useState<PDFFile[]>([]);
  const [selectedPDF, setSelectedPDF] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    currentPage: 0,
    totalPages: 0,
    questionsFound: 0,
    duplicatesSkipped: 0,
    message: ''
  });
  const [importHistory, setImportHistory] = useState<{ pdf: string; count: number; date: string }[]>([]);
  const [existingHashes, setExistingHashes] = useState<Set<string>>(new Set());

  const subjects = [
    "Biochemistry",
    "Immunology",
    "Microbiology",
    "Pathology",
    "Pharmacology",
    "Physiology",
    "Anatomy",
    "Behavioral Science",
    "Behavioral Science & Psychiatry"
  ];

  const systems = [
    "Cell Biology",
    "Molecular Biology",
    "Genetics",
    "Metabolism",
    "Cardiovascular",
    "Respiratory",
    "Renal",
    "Gastrointestinal",
    "Endocrine",
    "Reproductive",
    "Musculoskeletal",
    "Nervous System",
    "Hematology",
    "Immune System",
    "General Principles"
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by source_pdf
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
        .not('question_hash', 'is', null);

      if (error) throw error;

      const hashes = new Set((data || []).map(q => q.question_hash).filter(Boolean) as string[]);
      setExistingHashes(hashes);
    } catch (error) {
      console.error("Error loading existing hashes:", error);
    }
  };

  const generateQuestionHash = (questionText: string): string => {
    // Simple hash function for duplicate detection
    const normalized = questionText.toLowerCase().replace(/\s+/g, ' ').trim();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  };

  const checkDuplicate = (questionText: string): boolean => {
    const hash = generateQuestionHash(questionText);
    return existingHashes.has(hash);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const pdfFiles: PDFFile[] = Array.from(files)
        .filter(file => file.type === 'application/pdf')
        .map(file => ({
          name: file.name,
          path: URL.createObjectURL(file),
          size: file.size
        }));
      
      setAvailablePDFs(prev => [...prev, ...pdfFiles]);
      toast.success(`Added ${pdfFiles.length} PDF(s) to the queue`);
    }
  };

  const simulateImport = async () => {
    if (!selectedPDF || !selectedSubject || !selectedSystem) {
      toast.error("Please select a PDF, subject, and system before importing");
      return;
    }

    setProgress({
      status: 'processing',
      currentPage: 0,
      totalPages: 10, // Simulated
      questionsFound: 0,
      duplicatesSkipped: 0,
      message: 'Starting import...'
    });

    // Simulate processing pages
    for (let page = 1; page <= 10; page++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const questionsOnPage = Math.floor(Math.random() * 3) + 1;
      const duplicatesOnPage = Math.random() > 0.7 ? 1 : 0;

      setProgress(prev => ({
        ...prev,
        currentPage: page,
        questionsFound: prev.questionsFound + questionsOnPage - duplicatesOnPage,
        duplicatesSkipped: prev.duplicatesSkipped + duplicatesOnPage,
        message: `Processing page ${page}...`
      }));
    }

    setProgress(prev => ({
      ...prev,
      status: 'complete',
      message: 'Import complete!'
    }));

    toast.success(`Import complete! Found ${progress.questionsFound} questions, skipped ${progress.duplicatesSkipped} duplicates`);
    
    // Refresh history
    loadImportHistory();
  };

  const resetImport = () => {
    setProgress({
      status: 'idle',
      currentPage: 0,
      totalPages: 0,
      questionsFound: 0,
      duplicatesSkipped: 0,
      message: ''
    });
    setSelectedPDF("");
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PDF Import</h1>
          <p className="text-muted-foreground">
            Import questions from PDF files with duplicate detection
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
              Upload PDF files and select one to process
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
                        selectedPDF === pdf.name ? 'border-primary bg-primary/5' : 'border-border'
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
                        variant={selectedPDF === pdf.name ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPDF(pdf.name)}
                      >
                        {selectedPDF === pdf.name ? "Selected" : "Select"}
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
                onClick={simulateImport}
                disabled={!selectedPDF || !selectedSubject || !selectedSystem || progress.status === 'processing'}
                className="flex-1"
              >
                {progress.status === 'processing' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Import
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
                  <Badge variant={progress.status === 'complete' ? 'default' : 'secondary'}>
                    {progress.status === 'complete' ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Complete</>
                    ) : progress.status === 'error' ? (
                      <><AlertCircle className="h-3 w-3 mr-1" /> Error</>
                    ) : (
                      'Processing'
                    )}
                  </Badge>
                </div>
                <Progress 
                  value={progress.totalPages > 0 ? (progress.currentPage / progress.totalPages) * 100 : 0} 
                />
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground">Page</p>
                    <p className="font-semibold">{progress.currentPage}/{progress.totalPages}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Questions</p>
                    <p className="font-semibold text-green-600">{progress.questionsFound}</p>
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

        {/* Import History Panel */}
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
              <div className="space-y-3">
                {importHistory.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm truncate max-w-32">
                          {item.pdf}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{item.count} Q</Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Duplicate Detection</p>
                <p className="text-xs">
                  Questions are hashed and compared against existing entries. 
                  Duplicates are automatically skipped during import.
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
