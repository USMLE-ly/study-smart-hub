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
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchId] = useState(() => crypto.randomUUID());
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFilesOnly = files.filter(f => f.type === 'application/pdf');
    
    if (pdfFilesOnly.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Only PDF files are accepted",
        variant: "destructive"
      });
    }

    const newPdfFiles: PDFFile[] = pdfFilesOnly.map((file, index) => ({
      file,
      id: crypto.randomUUID(),
      orderIndex: pdfFiles.length + index + 1,
      status: 'pending'
    }));

    setPdfFiles(prev => [...prev, ...newPdfFiles]);
  }, [pdfFiles.length, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const pdfFilesOnly = files.filter(f => f.type === 'application/pdf');
    
    const newPdfFiles: PDFFile[] = pdfFilesOnly.map((file, index) => ({
      file,
      id: crypto.randomUUID(),
      orderIndex: pdfFiles.length + index + 1,
      status: 'pending'
    }));

    setPdfFiles(prev => [...prev, ...newPdfFiles]);
  }, [pdfFiles.length]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = (id: string) => {
    setPdfFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      return filtered.map((f, index) => ({ ...f, orderIndex: index + 1 }));
    });
  };

  const startBatchUpload = async () => {
    if (!user) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      // Create PDF records in database with locked order
      for (const pdf of pdfFiles) {
        setPdfFiles(prev => prev.map(p => 
          p.id === pdf.id ? { ...p, status: 'uploading' } : p
        ));

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
      }

      toast({
        title: "PDFs registered",
        description: `${pdfFiles.length} PDFs added to processing queue with locked order`
      });

      // Navigate to first PDF for processing
      navigate(`/admin/pdfs/${pdfFiles[0].id}/process`);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
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
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={startBatchUpload}
            disabled={isProcessing || pdfFiles.some(p => p.status !== 'pending')}
          >
            {isProcessing ? 'Processing...' : 'Lock Order & Start Processing'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
