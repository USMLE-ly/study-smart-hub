import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, Upload, CheckCircle, AlertCircle, Loader2, 
  FolderOpen, RefreshCw, Play, Pause, SkipForward 
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PublicPDF {
  name: string;
  path: string;
  status: 'pending' | 'processing' | 'complete' | 'error' | 'skipped';
  questionsImported?: number;
  error?: string;
  subject: string;
  system: string;
}

interface ImportProgress {
  status: 'idle' | 'scanning' | 'processing' | 'complete' | 'error' | 'paused';
  currentFile: string;
  totalFiles: number;
  processedFiles: number;
  totalQuestionsImported: number;
  totalDuplicatesSkipped: number;
  percent: number;
}

// PDF category detection based on filename
const detectCategory = (filename: string): { subject: string; system: string } => {
  const lower = filename.toLowerCase();
  
  if (lower.includes('genetic')) {
    return { subject: 'Biochemistry', system: 'Genetics' };
  }
  if (lower.includes('biostat')) {
    return { subject: 'Behavioral Science', system: 'General Principles' };
  }
  if (lower.includes('ent')) {
    return { subject: 'Anatomy', system: 'Nervous System' };
  }
  if (lower.includes('cardio')) {
    return { subject: 'Physiology', system: 'Cardiovascular' };
  }
  if (lower.includes('renal') || lower.includes('kidney')) {
    return { subject: 'Physiology', system: 'Renal' };
  }
  if (lower.includes('gi') || lower.includes('gastro')) {
    return { subject: 'Physiology', system: 'Gastrointestinal' };
  }
  if (lower.includes('neuro')) {
    return { subject: 'Anatomy', system: 'Nervous System' };
  }
  if (lower.includes('immuno')) {
    return { subject: 'Immunology', system: 'Immune System' };
  }
  if (lower.includes('micro')) {
    return { subject: 'Microbiology', system: 'General Principles' };
  }
  if (lower.includes('pharm')) {
    return { subject: 'Pharmacology', system: 'General Principles' };
  }
  if (lower.includes('path')) {
    return { subject: 'Pathology', system: 'General Principles' };
  }
  
  return { subject: 'Biochemistry', system: 'General Principles' };
};

const BulkPDFImport = () => {
  const [publicPDFs, setPublicPDFs] = useState<PublicPDF[]>([]);
  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    currentFile: '',
    totalFiles: 0,
    processedFiles: 0,
    totalQuestionsImported: 0,
    totalDuplicatesSkipped: 0,
    percent: 0
  });
  const [existingHashes, setExistingHashes] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [skipCurrent, setSkipCurrent] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const subjects = [
    "Biochemistry", "Immunology", "Microbiology", "Pathology",
    "Pharmacology", "Physiology", "Anatomy", "Behavioral Science"
  ];

  const systems = [
    "Cell Biology", "Molecular Biology", "Genetics", "Metabolism",
    "Cardiovascular", "Respiratory", "Renal", "Gastrointestinal",
    "Endocrine", "Reproductive", "Musculoskeletal", "Nervous System",
    "Hematology", "Immune System", "General Principles"
  ];

  // Scan public/pdfs folder for available PDFs
  const scanPublicPDFs = async () => {
    setProgress(prev => ({ ...prev, status: 'scanning' }));
    
    try {
      // Fetch the list of PDFs from the public folder
      const response = await fetch('/pdfs/');
      
      // Since we can't list directories, we'll use the known PDFs
      const knownPDFs = [
        // Genetics PDFs
        'genetics-1-5.pdf', 'genetics-1-8.pdf', 'genetics-2-6.pdf', 'genetics-3-6.pdf',
        'genetics-3-8.pdf', 'genetics-4-6.pdf', 'genetics-5-7.pdf', 'genetics-6-7.pdf',
        'genetics-7-5.pdf', 'genetics-8-5.pdf',
        // Biostat PDFs
        'biostat-2-6.pdf', 'biostat-3-6.pdf', 'biostat-4-6.pdf', 'biostat-5-7.pdf',
        'biostat-6-7.pdf', 'biostat-7-5.pdf', 'biostat-8-5.pdf', 'biostat-9-4.pdf',
        'biostat-10-4.pdf', 'biostat-11-3.pdf', 'biostat-12-3.pdf', 'biostat-13-3.pdf',
        'biostat-14-3.pdf',
        // ENT PDFs
        'ENT-1.pdf', 'ENT-2.pdf', 'ENT-3.pdf', 'ENT-4.pdf', 'ENT-5.pdf',
        // Other
        '2.pdf'
      ];
      
      const pdfs: PublicPDF[] = knownPDFs.map(name => {
        const category = detectCategory(name);
        return {
          name,
          path: `/pdfs/${name}`,
          status: 'pending' as const,
          subject: category.subject,
          system: category.system
        };
      });
      
      setPublicPDFs(pdfs);
      setProgress(prev => ({ 
        ...prev, 
        status: 'idle', 
        totalFiles: pdfs.length 
      }));
      
      toast.success(`Found ${pdfs.length} PDFs ready for processing`);
    } catch (error) {
      console.error('Error scanning PDFs:', error);
      toast.error('Failed to scan for PDFs');
      setProgress(prev => ({ ...prev, status: 'error' }));
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

  useEffect(() => {
    scanPublicPDFs();
    loadExistingHashes();
  }, []);

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

  // Fetch and convert PDF to base64
  const fetchPDFAsBase64 = async (pdfPath: string): Promise<string> => {
    const response = await fetch(pdfPath);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Process a single PDF
  const processPDF = async (pdf: PublicPDF): Promise<{ imported: number; skipped: number }> => {
    // Fetch PDF as base64
    const pdfBase64 = await fetchPDFAsBase64(pdf.path);
    
    // Call edge function
    const { data: aiResult, error: aiError } = await supabase.functions.invoke('parse-pdf-questions', {
      body: {
        pdfBase64,
        pdfFileName: pdf.name,
        subject: pdf.subject,
        system: pdf.system,
        extractImages: true
      }
    });

    if (aiError) throw aiError;
    if (!aiResult?.success) {
      throw new Error(aiResult?.error || 'Failed to parse questions');
    }

    const questions = aiResult.questions || [];
    let imported = 0;
    let skipped = 0;

    for (const q of questions) {
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
            q.options.map((opt: any) => ({
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
    }

    return { imported, skipped };
  };

  // Start bulk import
  const startBulkImport = async () => {
    const pendingPDFs = publicPDFs.filter(p => p.status === 'pending');
    if (pendingPDFs.length === 0) {
      toast.error("No PDFs to process");
      return;
    }

    setProgress({
      status: 'processing',
      currentFile: '',
      totalFiles: pendingPDFs.length,
      processedFiles: 0,
      totalQuestionsImported: 0,
      totalDuplicatesSkipped: 0,
      percent: 0
    });
    setIsPaused(false);

    let totalImported = 0;
    let totalSkipped = 0;

    for (let i = 0; i < publicPDFs.length; i++) {
      // Check if paused
      while (isPaused && progress.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check if should skip current
      if (skipCurrent) {
        setSkipCurrent(false);
        setPublicPDFs(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'skipped' as const } : p
        ));
        continue;
      }

      const pdf = publicPDFs[i];
      if (pdf.status !== 'pending') continue;

      setProgress(prev => ({
        ...prev,
        currentFile: pdf.name,
        processedFiles: i,
        percent: Math.round((i / prev.totalFiles) * 100)
      }));

      setPublicPDFs(prev => prev.map((p, idx) => 
        idx === i ? { ...p, status: 'processing' as const } : p
      ));

      try {
        const { imported, skipped } = await processPDF(pdf);
        totalImported += imported;
        totalSkipped += skipped;

        setPublicPDFs(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'complete' as const, questionsImported: imported } : p
        ));

        setProgress(prev => ({
          ...prev,
          totalQuestionsImported: totalImported,
          totalDuplicatesSkipped: totalSkipped
        }));

        // Small delay between PDFs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setPublicPDFs(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'error' as const, error: errorMessage } : p
        ));
      }
    }

    setProgress(prev => ({
      ...prev,
      status: 'complete',
      processedFiles: prev.totalFiles,
      percent: 100
    }));

    toast.success(`Import complete! ${totalImported} questions added.`);
  };

  // Filter PDFs based on category
  const filteredPDFs = filterCategory === 'all' 
    ? publicPDFs 
    : publicPDFs.filter(pdf => {
        const lower = pdf.name.toLowerCase();
        if (filterCategory === 'genetics') return lower.includes('genetic');
        if (filterCategory === 'biostat') return lower.includes('biostat');
        if (filterCategory === 'ent') return lower.includes('ent');
        return true;
      });

  const pendingCount = filteredPDFs.filter(p => p.status === 'pending').length;
  const completeCount = filteredPDFs.filter(p => p.status === 'complete').length;
  const errorCount = filteredPDFs.filter(p => p.status === 'error').length;

  const updatePDFSubject = (index: number, subject: string) => {
    setPublicPDFs(prev => prev.map((p, i) => i === index ? { ...p, subject } : p));
  };

  const updatePDFSystem = (index: number, system: string) => {
    setPublicPDFs(prev => prev.map((p, i) => i === index ? { ...p, system } : p));
  };

  return (
    <AppLayout title="Bulk PDF Import">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bulk PDF Import</h1>
            <p className="text-muted-foreground">
              Process all PDFs from public/pdfs folder automatically
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={scanPublicPDFs} disabled={progress.status === 'processing'}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rescan
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{publicPDFs.length}</div>
              <p className="text-xs text-muted-foreground">Total PDFs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-[hsl(var(--badge-success))]">{completeCount}</div>
              <p className="text-xs text-muted-foreground">Complete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{errorCount}</div>
              <p className="text-xs text-muted-foreground">Errors</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        {progress.status !== 'idle' && progress.status !== 'scanning' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {progress.status === 'complete' ? 'Import Complete!' : `Processing: ${progress.currentFile}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {progress.processedFiles} / {progress.totalFiles} files processed
                  </p>
                </div>
                <div className="flex gap-2">
                  {progress.status === 'processing' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsPaused(!isPaused)}
                      >
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSkipCurrent(true)}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <Progress value={progress.percent} />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Questions Imported:</span>{' '}
                  <span className="font-medium text-[hsl(var(--badge-success))]">{progress.totalQuestionsImported}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duplicates Skipped:</span>{' '}
                  <span className="font-medium text-[hsl(var(--badge-warning))]">{progress.totalDuplicatesSkipped}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PDFs</SelectItem>
              <SelectItem value="genetics">Genetics</SelectItem>
              <SelectItem value="biostat">Biostatistics</SelectItem>
              <SelectItem value="ent">ENT</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={startBulkImport} 
            disabled={pendingCount === 0 || progress.status === 'processing'}
            className="ml-auto"
          >
            {progress.status === 'processing' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Start Bulk Import ({pendingCount} PDFs)
              </>
            )}
          </Button>
        </div>

        {/* PDF List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Available PDFs
            </CardTitle>
            <CardDescription>
              PDFs detected in public/pdfs folder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredPDFs.map((pdf, index) => (
                  <div
                    key={pdf.name}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      pdf.status === 'complete' ? 'border-[hsl(var(--badge-success))]/50 bg-[hsl(var(--badge-success))]/5' :
                      pdf.status === 'error' ? 'border-destructive/50 bg-destructive/5' :
                      pdf.status === 'processing' ? 'border-primary bg-primary/5' :
                      pdf.status === 'skipped' ? 'border-muted bg-muted/50' :
                      'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {pdf.status === 'complete' ? (
                        <CheckCircle className="h-5 w-5 text-[hsl(var(--badge-success))]" />
                      ) : pdf.status === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : pdf.status === 'processing' ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{pdf.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pdf.status === 'complete' && `${pdf.questionsImported} questions imported`}
                          {pdf.status === 'error' && pdf.error}
                          {pdf.status === 'pending' && `${pdf.subject} • ${pdf.system}`}
                          {pdf.status === 'skipped' && 'Skipped'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {pdf.status === 'pending' && (
                        <>
                          <Select 
                            value={pdf.subject} 
                            onValueChange={(val) => updatePDFSubject(index, val)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map(s => (
                                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={pdf.system} 
                            onValueChange={(val) => updatePDFSystem(index, val)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {systems.map(s => (
                                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                      <Badge variant={
                        pdf.status === 'complete' ? 'default' :
                        pdf.status === 'error' ? 'destructive' :
                        pdf.status === 'processing' ? 'secondary' :
                        'outline'
                      }>
                        {pdf.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default BulkPDFImport;
