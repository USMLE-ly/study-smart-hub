import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, ArrowRight, Lock, CheckCircle, AlertCircle, Loader2, RotateCcw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PDFFile {
  file: File;
  id: string;
  orderIndex: number;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error';
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  questionsExtracted?: number;
  error?: string;
  retryable?: boolean;
}

const PDFUpload = () => {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [batchId] = useState(() => crypto.randomUUID());
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // STEP 1: Upload only - always succeeds if file is valid
  const uploadPDF = async (pdf: PDFFile): Promise<boolean> => {
    if (!user) return false;
    
    setPdfFiles(prev => prev.map(p => 
      p.id === pdf.id ? { ...p, uploadStatus: 'uploading', progress: 20 } : p
    ));

    try {
      // Store file in Supabase storage
      const storagePath = `pdfs/${batchId}/${pdf.id}_${pdf.file.name}`;
      const { error: storageError } = await supabase.storage
        .from('question-images')
        .upload(storagePath, pdf.file, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (storageError) {
        console.error('Storage error:', storageError);
        // Continue - we'll use base64 fallback
      }

      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, progress: 40 } : p
      ));

      // Create database record - status is 'uploaded', processingStatus 'pending'
      const { error: dbError } = await supabase.from('pdfs').insert({
        id: pdf.id,
        upload_batch_id: batchId,
        filename: pdf.file.name,
        order_index: pdf.orderIndex,
        status: 'uploaded',
        user_id: user.id
      });

      if (dbError) throw dbError;

      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { 
          ...p, 
          uploadStatus: 'uploaded', 
          processingStatus: 'pending',
          progress: 50 
        } : p
      ));

      toast({
        title: "Upload complete",
        description: `${pdf.file.name} uploaded successfully`
      });

      return true;
    } catch (error) {
      console.error('Upload error:', error);
      
      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { 
          ...p, 
          uploadStatus: 'error', 
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed'
        } : p
      ));

      return false;
    }
  };

  // STEP 2: Process PDF - isolated from upload
  const processPDF = async (pdf: PDFFile) => {
    if (!user) return;
    
    setPdfFiles(prev => prev.map(p => 
      p.id === pdf.id ? { 
        ...p, 
        processingStatus: 'processing', 
        progress: 60,
        error: undefined 
      } : p
    ));

    try {
      // Convert to base64 for processing
      const pdfBase64 = await fileToBase64(pdf.file);
      
      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, progress: 70 } : p
      ));

      // Call processing function
      const { data, error } = await supabase.functions.invoke('parse-pdf-questions', {
        body: { 
          pdfBase64,
          pdfFileName: pdf.file.name,
          pdfId: pdf.id,
          subject: 'General',
          system: 'General'
        }
      });

      if (error) throw error;

      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, progress: 85 } : p
      ));

      // Save extracted questions
      if (data?.questions && data.questions.length > 0) {
        for (const question of data.questions) {
          const { data: questionData, error: questionError } = await supabase
            .from('questions')
            .insert({
              question_text: question.question_text,
              explanation: question.explanation,
              subject: question.subject || 'General',
              system: question.system || 'General',
              category: question.category,
              pdf_id: pdf.id,
              has_image: question.has_image || false,
              image_description: question.image_description,
              question_image_url: question.question_image_url,
              explanation_image_url: question.explanation_image_url
            })
            .select()
            .single();

          if (questionError) {
            console.error('Question insert error:', questionError);
            continue;
          }

          if (question.options && Array.isArray(question.options)) {
            for (const option of question.options) {
              await supabase.from('question_options').insert({
                question_id: questionData.id,
                option_letter: option.letter,
                option_text: option.text,
                is_correct: option.is_correct,
                explanation: option.explanation
              });
            }
          }
        }

        // Update PDF status to completed
        await supabase.from('pdfs').update({
          status: 'completed',
          total_questions: data.questions.length,
          processed_questions: data.questions.length
        }).eq('id', pdf.id);

        setPdfFiles(prev => prev.map(p => 
          p.id === pdf.id ? { 
            ...p, 
            processingStatus: 'completed', 
            progress: 100,
            questionsExtracted: data.questions.length,
            retryable: false
          } : p
        ));

        toast({
          title: "Processing complete",
          description: `${data.questions.length} questions extracted from ${pdf.file.name}`
        });
      } else {
        throw new Error('No questions could be extracted from this PDF');
      }

    } catch (error) {
      console.error('Processing error:', error);
      
      // Update PDF status to error - but upload is still valid
      await supabase.from('pdfs').update({
        status: 'error'
      }).eq('id', pdf.id);

      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { 
          ...p, 
          processingStatus: 'failed', 
          progress: 50, // Keep at 50 to show upload succeeded
          error: error instanceof Error ? error.message : 'Processing failed',
          retryable: true
        } : p
      ));

      toast({
        title: "Processing failed",
        description: `${pdf.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}. You can retry.`,
        variant: "destructive"
      });
    }
  };

  // Retry failed processing
  const retryProcessing = async (pdfId: string) => {
    const pdf = pdfFiles.find(p => p.id === pdfId);
    if (pdf && pdf.retryable) {
      await processPDF(pdf);
    }
  };

  // Start processing for all uploaded PDFs that are pending
  const startProcessing = async () => {
    const pendingPdfs = pdfFiles.filter(p => 
      p.uploadStatus === 'uploaded' && p.processingStatus === 'pending'
    );
    
    for (const pdf of pendingPdfs) {
      await processPDF(pdf);
    }
  };

  // Handle file selection - ONLY upload, no processing
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFilesOnly = files.filter(f => f.type === 'application/pdf');
    
    if (pdfFilesOnly.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Only PDF files are accepted",
        variant: "destructive"
      });
    }

    if (pdfFilesOnly.length === 0) return;

    const currentLength = pdfFiles.length;
    const newPdfFiles: PDFFile[] = pdfFilesOnly.map((file, index) => ({
      file,
      id: crypto.randomUUID(),
      orderIndex: currentLength + index + 1,
      uploadStatus: 'pending' as const,
      processingStatus: 'pending' as const,
      progress: 0
    }));

    setPdfFiles(prev => [...prev, ...newPdfFiles]);
    
    // ONLY upload - processing is triggered separately
    for (const pdf of newPdfFiles) {
      await uploadPDF(pdf);
    }
  }, [pdfFiles.length, toast, user, batchId]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const pdfFilesOnly = files.filter(f => f.type === 'application/pdf');
    
    if (pdfFilesOnly.length === 0) return;

    const currentLength = pdfFiles.length;
    const newPdfFiles: PDFFile[] = pdfFilesOnly.map((file, index) => ({
      file,
      id: crypto.randomUUID(),
      orderIndex: currentLength + index + 1,
      uploadStatus: 'pending' as const,
      processingStatus: 'pending' as const,
      progress: 0
    }));

    setPdfFiles(prev => [...prev, ...newPdfFiles]);
    
    // ONLY upload - processing is triggered separately
    for (const pdf of newPdfFiles) {
      await uploadPDF(pdf);
    }
  }, [pdfFiles.length, user, batchId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const allCompleted = pdfFiles.length > 0 && pdfFiles.every(p => p.processingStatus === 'completed');
  const hasFailed = pdfFiles.some(p => p.processingStatus === 'failed');
  const isUploading = pdfFiles.some(p => p.uploadStatus === 'uploading');
  const isProcessing = pdfFiles.some(p => p.processingStatus === 'processing');
  const hasUploaded = pdfFiles.some(p => p.uploadStatus === 'uploaded');
  const hasPendingProcessing = pdfFiles.some(p => 
    p.uploadStatus === 'uploaded' && p.processingStatus === 'pending'
  );
  const totalQuestions = pdfFiles.reduce((sum, p) => sum + (p.questionsExtracted || 0), 0);

  const getStatusBadge = (pdf: PDFFile) => {
    if (pdf.uploadStatus === 'uploading') {
      return <Badge variant="outline"><Loader2 className="w-3 h-3 animate-spin mr-1" />Uploading</Badge>;
    }
    if (pdf.uploadStatus === 'error') {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Upload Failed</Badge>;
    }
    if (pdf.processingStatus === 'processing') {
      return <Badge variant="secondary"><Loader2 className="w-3 h-3 animate-spin mr-1" />Processing</Badge>;
    }
    if (pdf.processingStatus === 'completed') {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
    }
    if (pdf.processingStatus === 'failed') {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    }
    if (pdf.uploadStatus === 'uploaded') {
      return <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />Uploaded</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Automated PDF Processing</h1>
        <p className="text-muted-foreground mt-2">
          Upload PDFs. The system automatically extracts all questions, answers, explanations, and images.
        </p>
      </div>

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Fully Automated Pipeline</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• Upload always succeeds (processing is separate)</li>
                <li>• AI extracts questions verbatim</li>
                <li>• Failed processing can be retried</li>
                <li>• No manual text extraction required</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg mb-2">Drag & drop PDFs here</p>
            <p className="text-sm text-muted-foreground mb-4">
              Files will be processed automatically after upload
            </p>
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload"
              disabled={isUploading}
            />
            <Button asChild variant="outline" disabled={isUploading}>
              <label htmlFor="pdf-upload" className="cursor-pointer">
                {isUploading ? 'Uploading...' : 'Select PDFs'}
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {pdfFiles.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Processing Queue
            </CardTitle>
            <CardDescription>
              PDFs are processed in order. Upload and processing are separate operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pdfFiles.map((pdf) => (
                <div key={pdf.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      {pdf.orderIndex}
                    </div>
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <span className="flex-1 font-medium truncate">{pdf.file.name}</span>
                    {getStatusBadge(pdf)}
                    {pdf.questionsExtracted !== undefined && (
                      <Badge variant="outline" className="text-primary">
                        {pdf.questionsExtracted} questions
                      </Badge>
                    )}
                    {pdf.retryable && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => retryProcessing(pdf.id)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Retry
                      </Button>
                    )}
                  </div>
                  
                  {(pdf.uploadStatus === 'uploading' || pdf.processingStatus === 'processing') && (
                    <Progress value={pdf.progress} className="h-2" />
                  )}
                  
                  {pdf.error && (
                    <p className="text-sm text-destructive mt-2">{pdf.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pdfFiles.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading PDFs...
              </span>
            ) : isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing PDFs...
              </span>
            ) : allCompleted ? (
              <span className="text-primary font-medium">
                ✓ All PDFs processed: {totalQuestions} questions extracted
              </span>
            ) : hasPendingProcessing ? (
              <span className="text-muted-foreground">
                {pdfFiles.filter(p => p.uploadStatus === 'uploaded').length} PDF(s) uploaded. Ready to process.
              </span>
            ) : hasFailed ? (
              <span className="text-destructive">
                Some PDFs failed to process. Click Retry to try again.
              </span>
            ) : null}
          </div>
          
          <div className="flex gap-4">
            {hasPendingProcessing && !isProcessing && (
              <Button size="lg" onClick={startProcessing} className="gap-2">
                <Play className="w-4 h-4" />
                Process All ({pdfFiles.filter(p => p.uploadStatus === 'uploaded' && p.processingStatus === 'pending').length})
              </Button>
            )}
            {(allCompleted || hasFailed) && (
              <Button size="lg" onClick={() => navigate('/admin/pdfs')}>
                View Results
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
