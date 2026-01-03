import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Image, AlertTriangle, CheckCircle, ArrowRight, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExtractedQuestion {
  question_order: number;
  question_text: string;
  answer_choices: { choice_id: string; choice_text: string; is_correct: boolean }[];
  correct_answer_id: string;
  explanation_text: string;
  images: { source: string; position: string }[];
  validation: {
    text_complete: boolean;
    explanation_complete: boolean;
    images_attached: boolean;
  };
}

interface PDFData {
  id: string;
  filename: string;
  order_index: number;
  status: string;
  total_questions: number;
  processed_questions: number;
}

const PDFProcess = () => {
  const { pdfId } = useParams<{ pdfId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [pdf, setPdf] = useState<PDFData | null>(null);
  const [pdfText, setPdfText] = useState('');
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'review' | 'validate'>('input');

  useEffect(() => {
    if (pdfId) {
      loadPDF();
    }
  }, [pdfId]);

  const loadPDF = async () => {
    const { data, error } = await supabase
      .from('pdfs')
      .select('*')
      .eq('id', pdfId)
      .single();

    if (error) {
      toast({ title: "Failed to load PDF", variant: "destructive" });
      return;
    }

    setPdf(data);
    if (data.status !== 'pending') {
      setCurrentStep('review');
    }
  };

  const extractQuestions = async () => {
    if (!pdfText.trim()) {
      toast({ title: "Please paste PDF text content", variant: "destructive" });
      return;
    }

    setIsExtracting(true);

    try {
      // Update PDF status
      await supabase.from('pdfs').update({ status: 'in_progress' }).eq('id', pdfId);

      const { data, error } = await supabase.functions.invoke('extract-questions-strict', {
        body: { pdfText, pdfId, subject: 'ENT', system: 'ENT' }
      });

      if (error) throw error;

      setExtractedQuestions(data.questions || []);
      setCurrentStep('review');
      
      toast({
        title: "Extraction complete",
        description: `${data.questions?.length || 0} questions extracted`
      });
    } catch (error) {
      console.error('Extraction error:', error);
      toast({
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImageUpload = async (questionIndex: number, position: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const filePath = `question-images/${pdfId}/${questionIndex}_${position}_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: "Upload failed", variant: "destructive" });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      // Update extracted question with image
      setExtractedQuestions(prev => prev.map((q, i) => {
        if (i === questionIndex) {
          return {
            ...q,
            images: [...q.images, { source: 'screenshot', position }],
            validation: { ...q.validation, images_attached: true }
          };
        }
        return q;
      }));

      toast({ title: "Image uploaded" });
    };
    input.click();
  };

  const saveQuestions = async () => {
    if (!user || !pdf) return;

    try {
      for (const question of extractedQuestions) {
        // Insert question
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .insert({
            question_text: question.question_text,
            explanation: question.explanation_text,
            subject: 'ENT',
            system: 'ENT',
            pdf_id: pdfId,
            has_image: question.images.length > 0
          })
          .select()
          .single();

        if (questionError) throw questionError;

        // Insert answer options
        for (const choice of question.answer_choices) {
          await supabase.from('question_options').insert({
            question_id: questionData.id,
            option_letter: choice.choice_id,
            option_text: choice.choice_text,
            is_correct: choice.is_correct
          });
        }
      }

      // Update PDF status
      await supabase.from('pdfs').update({
        status: 'completed',
        total_questions: extractedQuestions.length,
        processed_questions: extractedQuestions.length
      }).eq('id', pdfId);

      setCurrentStep('validate');
      toast({ title: "Questions saved successfully" });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const validateAndProceed = async () => {
    const allValid = extractedQuestions.every(q => 
      q.validation.text_complete && 
      q.validation.explanation_complete
    );

    if (!allValid) {
      toast({
        title: "Validation failed",
        description: "Some questions are incomplete",
        variant: "destructive"
      });
      return;
    }

    // Mark PDF as verified
    await supabase.from('pdfs').update({ status: 'verified' }).eq('id', pdfId);

    // Check for next PDF
    const { data: nextPdf } = await supabase
      .from('pdfs')
      .select('id')
      .gt('order_index', pdf?.order_index || 0)
      .eq('status', 'pending')
      .order('order_index', { ascending: true })
      .limit(1)
      .single();

    if (nextPdf) {
      navigate(`/admin/pdfs/${nextPdf.id}/process`);
    } else {
      toast({ title: "All PDFs processed!" });
      navigate('/admin/pdfs');
    }
  };

  const progress = pdf ? (pdf.processed_questions / Math.max(pdf.total_questions, 1)) * 100 : 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{pdf?.filename || 'Loading...'}</h1>
            <p className="text-muted-foreground">PDF #{pdf?.order_index}</p>
          </div>
          <Badge variant={
            pdf?.status === 'verified' ? 'default' :
            pdf?.status === 'completed' ? 'secondary' :
            pdf?.status === 'in_progress' ? 'outline' : 'destructive'
          }>
            {pdf?.status}
          </Badge>
        </div>
        {pdf && <Progress value={progress} className="h-2" />}
      </div>

      {/* Step: Input */}
      {currentStep === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Paste PDF Content</CardTitle>
            <CardDescription>
              Paste the raw text content from the PDF. The system will extract questions verbatim.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste PDF text content here..."
              value={pdfText}
              onChange={(e) => setPdfText(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />
            <div className="flex justify-end mt-4">
              <Button onClick={extractQuestions} disabled={isExtracting}>
                {isExtracting ? 'Extracting...' : 'Extract Questions'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Review */}
      {currentStep === 'review' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Review Extracted Questions</CardTitle>
              <CardDescription>
                Verify each question has text, explanation, and images attached.
              </CardDescription>
            </CardHeader>
          </Card>

          {extractedQuestions.map((question, index) => (
            <Card key={index} className={
              question.validation.text_complete && question.validation.explanation_complete
                ? 'border-green-500/50'
                : 'border-yellow-500/50'
            }>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                  <div className="flex gap-2">
                    {question.validation.text_complete && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" /> Text
                      </Badge>
                    )}
                    {question.validation.explanation_complete && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" /> Explanation
                      </Badge>
                    )}
                    {question.validation.images_attached ? (
                      <Badge variant="outline" className="text-green-600">
                        <Image className="w-3 h-3 mr-1" /> Images
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">
                        <AlertTriangle className="w-3 h-3 mr-1" /> No Images
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                {/* Question Text */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Question</h4>
                  <p className="text-sm whitespace-pre-wrap">{question.question_text}</p>
                  <div className="mt-4 space-y-1">
                    {question.answer_choices.map(choice => (
                      <div key={choice.choice_id} className={`text-sm p-2 rounded ${
                        choice.is_correct ? 'bg-green-100 dark:bg-green-900/30' : ''
                      }`}>
                        <strong>{choice.choice_id}.</strong> {choice.choice_text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Images</h4>
                  {question.images.length > 0 ? (
                    <div className="space-y-2">
                      {question.images.map((img, imgIndex) => (
                        <Badge key={imgIndex} variant="secondary">
                          {img.position} ({img.source})
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">No images attached</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleImageUpload(index, 'explanation')}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Screenshot
                      </Button>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Explanation</h4>
                  <p className="text-sm whitespace-pre-wrap line-clamp-10">
                    {question.explanation_text || 'No explanation'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setCurrentStep('input')}>
              Back to Input
            </Button>
            <Button onClick={saveQuestions}>
              Save & Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Validate */}
      {currentStep === 'validate' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Step 3: Validation Gate
            </CardTitle>
            <CardDescription>
              Confirm all questions are complete before unlocking next PDF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>All {extractedQuestions.length} questions present</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>All explanations attached</span>
              </div>
              <div className="flex items-center gap-2">
                {extractedQuestions.every(q => q.validation.images_attached) ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                )}
                <span>Images attached where required</span>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={validateAndProceed}>
                Unlock Next PDF
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PDFProcess;
