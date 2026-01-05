import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Upload, 
  FileImage, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FolderOpen,
  ImageIcon
} from 'lucide-react';

interface ExtractedImage {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  description: string;
  page_number: number;
}

interface ProcessingResult {
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  imagesExtracted: number;
  categories: Record<string, number>;
  error?: string;
}

const UWorldImageImport = () => {
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [allExtractedImages, setAllExtractedImages] = useState<ExtractedImage[]>([]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processFile = async (file: File): Promise<ProcessingResult> => {
    setCurrentFile(file.name);
    
    try {
      const base64 = await fileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke('extract-uworld-images', {
        body: {
          pdfBase64: base64,
          pdfFileName: file.name,
        },
      });

      if (error) throw error;

      if (data.success) {
        setAllExtractedImages(prev => [...prev, ...data.images]);
        
        return {
          fileName: file.name,
          status: 'success',
          imagesExtracted: data.total_extracted,
          categories: data.categories,
        };
      } else {
        return {
          fileName: file.name,
          status: 'error',
          imagesExtracted: 0,
          categories: {},
          error: data.error || 'Unknown error',
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return {
        fileName: file.name,
        status: 'error',
        imagesExtracted: 0,
        categories: {},
        error: errorMessage,
      };
    }
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setResults([]);
    setAllExtractedImages([]);
    setOverallProgress(0);

    const fileArray = Array.from(files);
    const newResults: ProcessingResult[] = fileArray.map(f => ({
      fileName: f.name,
      status: 'pending' as const,
      imagesExtracted: 0,
      categories: {},
    }));
    setResults(newResults);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      // Update status to processing
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'processing' as const } : r
      ));

      const result = await processFile(file);
      
      // Update with result
      setResults(prev => prev.map((r, idx) => 
        idx === i ? result : r
      ));

      setOverallProgress(((i + 1) / fileArray.length) * 100);

      // Add delay between files to avoid rate limiting
      if (i < fileArray.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsProcessing(false);
    setCurrentFile(null);
    
    const successCount = results.filter(r => r.status === 'success').length;
    toast.success(`Processed ${successCount}/${fileArray.length} files successfully`);
  }, []);

  const totalImages = results.reduce((sum, r) => sum + r.imagesExtracted, 0);
  const allCategories = results.reduce((acc, r) => {
    Object.entries(r.categories).forEach(([cat, count]) => {
      acc[cat] = (acc[cat] || 0) + count;
    });
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">UWorld Image Import</h1>
        <p className="text-muted-foreground">
          Extract and categorize medical images from UWorld PDF files
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload UWorld Image PDFs
          </CardTitle>
          <CardDescription>
            Select one or more UWorld Images PDF files to extract and categorize medical diagrams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 hover:border-primary/50 transition-colors">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload">
              <Button asChild disabled={isProcessing}>
                <span>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileImage className="mr-2 h-4 w-4" />
                      Select PDF Files
                    </>
                  )}
                </span>
              </Button>
            </label>
            <p className="text-sm text-muted-foreground mt-2">
              Supports multiple UWorld Images PDF files
            </p>
          </div>

          {isProcessing && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              {currentFile && (
                <p className="text-sm text-muted-foreground">
                  Currently processing: {currentFile}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Processing Results */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {results.map((result, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {result.status === 'pending' && (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                        )}
                        {result.status === 'processing' && (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        )}
                        {result.status === 'success' && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{result.fileName}</p>
                          {result.status === 'success' && (
                            <p className="text-xs text-muted-foreground">
                              {result.imagesExtracted} images extracted
                            </p>
                          )}
                          {result.error && (
                            <p className="text-xs text-destructive">{result.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Extraction Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                  <span className="font-medium">Total Images Extracted</span>
                  <span className="text-2xl font-bold text-primary">{totalImages}</span>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(allCategories).map(([category, count]) => (
                      <Badge key={category} variant="secondary">
                        {category}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Extracted Images Preview */}
      {allExtractedImages.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Extracted Images ({allExtractedImages.length})</CardTitle>
            <CardDescription>
              Preview of all extracted medical images and their descriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allExtractedImages.slice(0, 50).map((img, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{img.category}</Badge>
                      <span className="text-xs text-muted-foreground">Page {img.page_number}</span>
                    </div>
                    <h4 className="font-medium text-sm">{img.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {img.description}
                    </p>
                  </div>
                ))}
              </div>
              {allExtractedImages.length > 50 && (
                <p className="text-center text-muted-foreground mt-4">
                  Showing first 50 of {allExtractedImages.length} images
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UWorldImageImport;
