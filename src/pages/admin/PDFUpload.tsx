import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, ArrowRight, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PDFFile {
  file: File;
  id: string;
  orderIndex: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
}

const PDFUpload = () => {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [batchId] = useState(() => crypto.randomUUID());
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const uploadPDF = async (pdf: PDFFile) => {
    if (!user) return;
    
    setPdfFiles(prev => prev.map(p => 
      p.id === pdf.id ? { ...p, status: 'uploading' } : p
    ));

    try {
      const { error } = await supabase.from('pdfs').insert({
        id: pdf.id,
        upload_batch_id: batchId,
        filename: pdf.file.name,
        order_index: pdf.orderIndex,
        status: 'pending',
        user_id: user.id
      });

      if (error) throw error;

      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, status: 'uploaded' } : p
      ));
    } catch (error) {
      console.error('Upload error:', error);
      setPdfFiles(prev => prev.map(p => 
        p.id === pdf.id ? { ...p, status: 'error' } : p
      ));
      toast({
        title: "Upload failed",
        description: pdf.file.name,
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

    const currentLength = pdfFiles.length;
    const newPdfFiles: PDFFile[] = pdfFilesOnly.map((file, index) => ({
      file,
      id: crypto.randomUUID(),
      orderIndex: currentLength + index + 1,
      status: 'uploading' as const
    }));

    setPdfFiles(prev => [...prev, ...newPdfFiles]);
    
    // Start uploading immediately
    for (const pdf of newPdfFiles) {
      await uploadPDF(pdf);
    }
  }, [pdfFiles.length, toast, user, batchId]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const pdfFilesOnly = files.filter(f => f.type === 'application/pdf');
    
    const currentLength = pdfFiles.length;
    const newPdfFiles: PDFFile[] = pdfFilesOnly.map((file, index) => ({
      file,
      id: crypto.randomUUID(),
      orderIndex: currentLength + index + 1,
      status: 'uploading' as const
    }));

    setPdfFiles(prev => [...prev, ...newPdfFiles]);
    
    // Start uploading immediately
    for (const pdf of newPdfFiles) {
      await uploadPDF(pdf);
    }
  }, [pdfFiles.length, user, batchId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = (id: string) => {
    setPdfFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      return filtered.map((f, index) => ({ ...f, orderIndex: index + 1 }));
    });
  };

  const allUploaded = pdfFiles.length > 0 && pdfFiles.every(p => p.status === 'uploaded');
  const hasErrors = pdfFiles.some(p => p.status === 'error');
  const isUploading = pdfFiles.some(p => p.status === 'uploading');

  const startProcessing = () => {
    if (pdfFiles.length === 0) return;
    
    toast({
      title: "Ready to process",
      description: `${pdfFiles.length} PDFs queued for processing`
    });
    
    navigate(`/admin/pdfs/${pdfFiles[0].id}/process`);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">PDF Intake</h1>
        <p className="text-muted-foreground mt-2">
          Upload PDFs in processing order. Order is locked permanently after upload.
        </p>
      </div>

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
            <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload"
            />
            <Button asChild variant="outline">
              <label htmlFor="pdf-upload" className="cursor-pointer">
                Select PDFs
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PDF Queue */}
      {pdfFiles.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Processing Queue (Order Locked)
            </CardTitle>
            <CardDescription>
              PDFs will be processed in this exact order. Order cannot be changed after upload.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pdfFiles.map((pdf) => (
                <div
                  key={pdf.id}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {pdf.orderIndex}
                  </div>
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 font-medium truncate">{pdf.file.name}</span>
                  <Badge variant={
                    pdf.status === 'uploaded' ? 'default' :
                    pdf.status === 'uploading' ? 'secondary' :
                    pdf.status === 'error' ? 'destructive' : 'outline'
                  }>
                    {pdf.status === 'uploaded' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {pdf.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                    {pdf.status}
                  </Badge>
                  {pdf.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(pdf.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      {pdfFiles.length > 0 && (
        <div className="flex justify-end gap-4">
          {isUploading && (
            <Badge variant="secondary" className="self-center">
              Uploading...
            </Badge>
          )}
          {hasErrors && (
            <Badge variant="destructive" className="self-center">
              Some uploads failed
            </Badge>
          )}
          <Button
            size="lg"
            onClick={startProcessing}
            disabled={!allUploaded || isUploading}
          >
            Start Processing
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
