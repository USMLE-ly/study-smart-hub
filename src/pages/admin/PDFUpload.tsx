import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, ArrowRight, Lock, CheckCircle, AlertCircle, Loader2, RotateCcw, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PDFFile {
  file: File | null; // null for loaded from DB
  id: string;
  orderIndex: number;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error';
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  questionsExtracted?: number;
  error?: string;
  retryable?: boolean;
  filename?: string; // For DB-loaded PDFs
}

const PDFUpload = () => {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [batchId] = useState(() => crypto.randomUUID());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load existing PDFs from database on mount
  useEffect(() => {
    const loadExistingPdfs = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: pdfs, error } = await supabase
          .from('pdfs')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true });

        if (error) throw error;

        if (pdfs && pdfs.length > 0) {
          const loadedFiles: PDFFile[] = pdfs.map(pdf => ({
            file: null,
            id: pdf.id,
            orderIndex: pdf.order_index,
            uploadStatus: 'uploaded' as const,
            processingStatus: mapDbStatus(pdf.status),
            progress: pdf.status === 'completed' ? 100 : pdf.status === 'in_progress' ? 60 : 50,
            questionsExtracted: pdf.processed_questions || undefined,
            filename: pdf.filename,
            retryable: pdf.status === 'error' || pdf.status === 'pending',
            error: pdf.status === 'error' ? 'Processing failed - click Retry' : undefined
          }));
          setPdfFiles(loadedFiles);
        }
      } catch (error) {
        console.error('Error loading PDFs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingPdfs();
  }, [user]);

  const mapDbStatus = (status: string): PDFFile['processingStatus'] => {
    switch (status) {
      case 'completed':
      case 'verified':
        return 'completed';
      case 'in_progress':
        return 'processing';
      case 'error':
        return 'failed';
      default:
        return 'pending';
    }
  };

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
    if (!user) {
      console.error('Upload failed: No authenticated user');
      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { 
          ...p, 
          uploadStatus: 'error', 
          error: 'Please log in to upload PDFs'
        } : p
      ));
      return false;
    }
    
    console.log('Starting upload for:', pdf.file.name, 'User:', user.id);
    
    setPdfFiles(prev => prev.map(p => 
      p.id === pdf.id ? { ...p, uploadStatus: 'uploading', progress: 20 } : p
    ));

    try {
      // Create database record FIRST - this is pure I/O
      console.log('Creating database record...');
      const { error: dbError } = await supabase.from('pdfs').insert({
        id: pdf.id,
        upload_batch_id: batchId,
        filename: pdf.file.name,
        order_index: pdf.orderIndex,
        status: 'pending', // Must match check constraint: pending, in_progress, completed, verified
        user_id: user.id
      });

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('Database record created successfully');
      
      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, progress: 40 } : p
      ));

      // Store file in Supabase storage (optional - we have base64 fallback)
      console.log('Uploading to storage...');
      const storagePath = `pdfs/${batchId}/${pdf.id}_${pdf.file.name}`;
      const { error: storageError } = await supabase.storage
        .from('question-images')
        .upload(storagePath, pdf.file, {
          contentType: 'application/pdf',
          upsert: true // Allow overwrite to prevent duplicate errors
        });

      if (storageError) {
        console.warn('Storage upload warning (non-fatal):', storageError);
        // Non-fatal - we can still process using base64
      } else {
        console.log('Storage upload successful');
      }

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

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });

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
      let pdfBase64: string;
      let fileName: string;

      // Check if we have the file object or need to fetch from storage
      if (pdf.file) {
        pdfBase64 = await fileToBase64(pdf.file);
        fileName = pdf.file.name;
      } else {
        // PDF loaded from DB - need to fetch from storage
        const { data: pdfRecord } = await supabase
          .from('pdfs')
          .select('upload_batch_id, filename')
          .eq('id', pdf.id)
          .single();

        if (!pdfRecord) throw new Error('PDF record not found');

        fileName = pdf.filename || pdfRecord.filename;
        const storagePath = `pdfs/${pdfRecord.upload_batch_id}/${pdf.id}_${pdfRecord.filename}`;
        
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('question-images')
          .download(storagePath);

        if (downloadError || !fileData) {
          throw new Error('Cannot retry: PDF file not found in storage. Please re-upload the file.');
        }

        // Convert blob to base64
        const reader = new FileReader();
        pdfBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(fileData);
        });
      }
      
      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, progress: 70 } : p
      ));

      // Call processing function
      const { data, error } = await supabase.functions.invoke('parse-pdf-questions', {
        body: { 
          pdfBase64,
          pdfFileName: fileName,
          pdfId: pdf.id,
          subject: 'General',
          system: 'General'
        }
      });

      if (error) {
        // Check for specific error types
        const errorMessage = error.message || String(error);
        if (errorMessage.includes('timeout') || errorMessage.includes('504')) {
          throw new Error('Processing timed out - PDF may be too large. Try a smaller file.');
        }
        throw new Error(errorMessage || 'Failed to send a request to the Edge Function');
      }

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

      const filename = pdf.file?.name || pdf.filename || 'PDF';
      toast({
        title: "Processing failed",
        description: `${filename}: ${error instanceof Error ? error.message : 'Unknown error'}. You can retry.`,
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

  // Delete PDF from queue and database
  const deletePDF = async (pdfId: string) => {
    const pdf = pdfFiles.find(p => p.id === pdfId);
    if (!pdf) return;

    // Don't allow deleting while processing
    if (pdf.processingStatus === 'processing' || pdf.uploadStatus === 'uploading') {
      toast({
        title: "Cannot delete",
        description: "Please wait for the current operation to complete",
        variant: "destructive"
      });
      return;
    }

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('pdfs')
        .delete()
        .eq('id', pdfId);

      if (dbError) throw dbError;

      // Try to delete from storage (non-fatal if fails)
      const { data: pdfRecord } = await supabase
        .from('pdfs')
        .select('upload_batch_id, filename')
        .eq('id', pdfId)
        .single();

      if (pdfRecord) {
        const storagePath = `pdfs/${pdfRecord.upload_batch_id}/${pdfId}_${pdfRecord.filename}`;
        await supabase.storage.from('question-images').remove([storagePath]);
      }

      // Remove from local state
      setPdfFiles(prev => prev.filter(p => p.id !== pdfId));

      toast({
        title: "PDF deleted",
        description: `${pdf.file?.name || pdf.filename} has been removed`
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
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

  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const validateFileSize = (files: File[]): { valid: File[]; oversized: File[] } => {
    const valid: File[] = [];
    const oversized: File[] = [];
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversized.push(file);
      } else {
        valid.push(file);
      }
    }
    
    return { valid, oversized };
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

    // Validate file sizes
    const { valid, oversized } = validateFileSize(pdfFilesOnly);
    
    if (oversized.length > 0) {
      const names = oversized.map(f => f.name).join(', ');
      toast({
        title: "Files too large",
        description: `${oversized.length} file(s) exceed ${MAX_FILE_SIZE_MB}MB limit: ${names}`,
        variant: "destructive"
      });
    }

    if (valid.length === 0) return;

    const currentLength = pdfFiles.length;
    const newPdfFiles: PDFFile[] = valid.map((file, index) => ({
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

    // Validate file sizes
    const { valid, oversized } = validateFileSize(pdfFilesOnly);
    
    if (oversized.length > 0) {
      const names = oversized.map(f => f.name).join(', ');
      toast({
        title: "Files too large",
        description: `${oversized.length} file(s) exceed ${MAX_FILE_SIZE_MB}MB limit: ${names}`,
        variant: "destructive"
      });
    }

    if (valid.length === 0) return;

    const currentLength = pdfFiles.length;
    const newPdfFiles: PDFFile[] = valid.map((file, index) => ({
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
  }, [pdfFiles.length, user, batchId, toast]);

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading PDFs...</span>
        </div>
      </div>
    );
  }

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
                <li>• Maximum file size: {MAX_FILE_SIZE_MB}MB per PDF</li>
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
              Max {MAX_FILE_SIZE_MB}MB per file • Files will be processed after upload
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
                    <span className="flex-1 font-medium truncate">{pdf.file?.name || pdf.filename}</span>
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
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deletePDF(pdf.id)}
                      disabled={pdf.processingStatus === 'processing' || pdf.uploadStatus === 'uploading'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
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
