import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, ArrowRight, Lock, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
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
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'error';
  progress: number;
  questionsExtracted?: number;
  error?: string;
}

const PDFUpload = () => {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [batchId] = useState(() => crypto.randomUUID());
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:application/pdf;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Extract text from PDF using browser APIs
  const extractTextFromPDF = async (file: File): Promise<string> => {
    // For now, we'll pass the base64 to the server for processing
    // The server-side function will handle text extraction
    return '';
  };

  const uploadAndProcessPDF = async (pdf: PDFFile, index: number) => {
    if (!user) return;
    
    // Update status to uploading
    setPdfFiles(prev => prev.map(p => 
      p.id === pdf.id ? { ...p, status: 'uploading', progress: 10 } : p
    ));

    try {
      // Step 1: Convert file to base64
      const pdfBase64 = await fileToBase64(pdf.file);
      
      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, progress: 30 } : p
      ));

      // Step 2: Upload to Supabase storage
      const storagePath = `pdfs/${batchId}/${pdf.id}_${pdf.file.name}`;
      const { error: storageError } = await supabase.storage
        .from('question-images')
        .upload(storagePath, pdf.file, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (storageError) {
        console.error('Storage upload error:', storageError);
        // Continue anyway - we have the base64
      }

      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, status: 'uploaded', progress: 50 } : p
      ));

      // Step 3: Insert PDF record
      const { error: dbError } = await supabase.from('pdfs').insert({
        id: pdf.id,
        upload_batch_id: batchId,
        filename: pdf.file.name,
        order_index: pdf.orderIndex,
        status: 'processing',
        user_id: user.id
      });

      if (dbError) throw dbError;

      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, status: 'processing', progress: 60 } : p
      ));

      // Step 4: Call server-side extraction (automated - no manual text paste)
      const { data, error } = await supabase.functions.invoke('parse-pdf-questions', {
        body: { 
          pdfBase64,
          pdfFileName: pdf.file.name,
          subject: 'General',
          system: 'General',
          extractImages: true,
          pdfText: '' // Empty - server will extract
        }
      });

      if (error) throw error;

      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, progress: 80 } : p
      ));

      // Step 5: If we got questions, save them
      if (data?.questions && data.questions.length > 0) {
        for (const question of data.questions) {
          // Insert question
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

          // Insert answer options
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
            status: 'completed', 
            progress: 100,
            questionsExtracted: data.questions.length
          } : p
        ));

        toast({
          title: "PDF processed",
          description: `${data.questions.length} questions extracted from ${pdf.file.name}`
        });
      } else {
        throw new Error('No questions extracted from PDF');
      }

    } catch (error) {
      console.error('Processing error:', error);
      
      // Update PDF status to error
      await supabase.from('pdfs').update({
        status: 'error'
      }).eq('id', pdf.id);

      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { 
          ...p, 
          status: 'error', 
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        } : p
      ));

      toast({
        title: "Processing failed",
        description: `${pdf.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

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
      status: 'uploading' as const,
      progress: 0
    }));

    setPdfFiles(prev => [...prev, ...newPdfFiles]);
    
    // Start processing each PDF sequentially (as per requirements)
    for (let i = 0; i < newPdfFiles.length; i++) {
      await uploadAndProcessPDF(newPdfFiles[i], i);
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
      status: 'uploading' as const,
      progress: 0
    }));

    setPdfFiles(prev => [...prev, ...newPdfFiles]);
    
    // Start processing each PDF sequentially
    for (let i = 0; i < newPdfFiles.length; i++) {
      await uploadAndProcessPDF(newPdfFiles[i], i);
    }
  }, [pdfFiles.length, user, batchId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const allCompleted = pdfFiles.length > 0 && pdfFiles.every(p => p.status === 'completed');
  const hasErrors = pdfFiles.some(p => p.status === 'error');
  const isProcessing = pdfFiles.some(p => p.status === 'uploading' || p.status === 'processing');
  const totalQuestions = pdfFiles.reduce((sum, p) => sum + (p.questionsExtracted || 0), 0);

  const viewResults = () => {
    navigate('/admin/pdfs');
  };

  const getStatusIcon = (status: PDFFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'uploaded':
        return <Zap className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: PDFFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'uploaded':
        return 'Uploaded';
      case 'processing':
        return 'Extracting...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Failed';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Automated PDF Processing</h1>
        <p className="text-muted-foreground mt-2">
          Upload PDFs. The system automatically extracts all questions, answers, explanations, and images.
          <br />
          <strong>No manual text extraction required.</strong>
        </p>
      </div>

      {/* System Info */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Fully Automated Pipeline</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• PDF text and images extracted server-side</li>
                <li>• AI parses questions verbatim (no modification)</li>
                <li>• All images preserved and attached</li>
                <li>• Validation enforced before completion</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone */}
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
              disabled={isProcessing}
            />
            <Button asChild variant="outline" disabled={isProcessing}>
              <label htmlFor="pdf-upload" className="cursor-pointer">
                {isProcessing ? 'Processing...' : 'Select PDFs'}
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Processing Queue */}
      {pdfFiles.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Processing Queue
            </CardTitle>
            <CardDescription>
              PDFs are processed in order. Each PDF must complete before the next begins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pdfFiles.map((pdf) => (
                <div
                  key={pdf.id}
                  className="p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      {pdf.orderIndex}
                    </div>
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <span className="flex-1 font-medium truncate">{pdf.file.name}</span>
                    <Badge variant={
                      pdf.status === 'completed' ? 'default' :
                      pdf.status === 'processing' ? 'secondary' :
                      pdf.status === 'uploading' ? 'outline' :
                      pdf.status === 'error' ? 'destructive' : 'outline'
                    }>
                      {getStatusIcon(pdf.status)}
                      <span className="ml-1">{getStatusLabel(pdf.status)}</span>
                    </Badge>
                    {pdf.questionsExtracted !== undefined && (
                      <Badge variant="outline" className="text-primary">
                        {pdf.questionsExtracted} questions
                      </Badge>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  {(pdf.status === 'uploading' || pdf.status === 'processing') && (
                    <Progress value={pdf.progress} className="h-2" />
                  )}
                  
                  {/* Error message */}
                  {pdf.status === 'error' && pdf.error && (
                    <p className="text-sm text-destructive mt-2">{pdf.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary & Actions */}
      {pdfFiles.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing PDFs... Do not close this page.
              </span>
            ) : allCompleted ? (
              <span className="text-primary font-medium">
                ✓ All PDFs processed: {totalQuestions} questions extracted
              </span>
            ) : hasErrors ? (
              <span className="text-destructive">
                Some PDFs failed to process
              </span>
            ) : null}
          </div>
          
          <div className="flex gap-4">
            {allCompleted && (
              <Button size="lg" onClick={viewResults}>
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
