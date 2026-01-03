import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Image, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuestionData {
  id: string;
  question_text: string;
  explanation: string | null;
  category: string | null;
  has_image: boolean | null;
  image_description: string | null;
  question_image_url: string | null;
  explanation_image_url: string | null;
  options: {
    id: string;
    option_letter: string;
    option_text: string;
    is_correct: boolean;
    explanation: string | null;
  }[];
}

interface PDFData {
  id: string;
  filename: string;
  order_index: number;
  status: string;
  total_questions: number | null;
  processed_questions: number | null;
}

const PDFProcess = () => {
  const { pdfId } = useParams<{ pdfId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pdf, setPdf] = useState<PDFData | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (pdfId) {
      loadPDFAndQuestions();
    }
  }, [pdfId]);

  const loadPDFAndQuestions = async () => {
    setIsLoading(true);
    
    try {
      // Load PDF
      const { data: pdfData, error: pdfError } = await supabase
        .from('pdfs')
        .select('*')
        .eq('id', pdfId)
        .single();

      if (pdfError) throw pdfError;
      setPdf(pdfData);

      // Load questions with options
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          explanation,
          category,
          has_image,
          image_description,
          question_image_url,
          explanation_image_url
        `)
        .eq('pdf_id', pdfId)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;

      // Load options for each question
      const questionsWithOptions: QuestionData[] = [];
      for (const q of questionsData || []) {
        const { data: optionsData } = await supabase
          .from('question_options')
          .select('*')
          .eq('question_id', q.id)
          .order('option_letter', { ascending: true });

        questionsWithOptions.push({
          ...q,
          options: optionsData || []
        });
      }

      setQuestions(questionsWithOptions);
    } catch (error) {
      console.error('Load error:', error);
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsVerified = async () => {
    if (!pdf) return;

    await supabase.from('pdfs').update({ status: 'verified' }).eq('id', pdfId);
    
    toast({ title: "PDF marked as verified" });
    navigate('/admin/pdfs');
  };

  const goToNextPdf = async () => {
    if (!pdf) return;

    const { data: nextPdf } = await supabase
      .from('pdfs')
      .select('id')
      .gt('order_index', pdf.order_index)
      .order('order_index', { ascending: true })
      .limit(1)
      .single();

    if (nextPdf) {
      navigate(`/admin/pdfs/${nextPdf.id}/process`);
    } else {
      toast({ title: "This is the last PDF" });
    }
  };

  const progress = pdf && pdf.total_questions 
    ? ((pdf.processed_questions || 0) / pdf.total_questions) * 100 
    : questions.length > 0 ? 100 : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading PDF data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/pdfs')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </div>
        
        <div className="flex items-center gap-4 mb-2">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{pdf?.filename || 'Unknown PDF'}</h1>
            <p className="text-muted-foreground">PDF #{pdf?.order_index} • {questions.length} questions extracted</p>
          </div>
          <Badge variant={
            pdf?.status === 'verified' ? 'default' :
            pdf?.status === 'completed' ? 'secondary' :
            pdf?.status === 'processing' ? 'outline' : 'destructive'
          }>
            {pdf?.status}
          </Badge>
        </div>
        
        <Progress value={progress} className="h-2" />
      </div>

      {/* Status Card */}
      <Card className="mb-6 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            Extraction Summary (Read-Only Review)
          </CardTitle>
          <CardDescription>
            Questions were extracted automatically. Review below for accuracy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{questions.length}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{questions.filter(q => q.explanation).length}</p>
              <p className="text-sm text-muted-foreground">With Explanations</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{questions.filter(q => q.has_image).length}</p>
              <p className="text-sm text-muted-foreground">With Images</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{questions.filter(q => q.options.length >= 4).length}</p>
              <p className="text-sm text-muted-foreground">Complete Options</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List (Read-Only) */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No questions extracted</p>
            <p className="text-muted-foreground">
              This PDF may not contain extractable questions, or processing failed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <Card key={question.id} className={
              question.explanation && question.options.length >= 2
                ? 'border-green-500/30'
                : 'border-yellow-500/30'
            }>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                  <div className="flex gap-2">
                    {question.explanation && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" /> Explanation
                      </Badge>
                    )}
                    {question.has_image ? (
                      <Badge variant="outline" className="text-green-600">
                        <Image className="w-3 h-3 mr-1" /> Has Image
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        No Image
                      </Badge>
                    )}
                    {question.category && (
                      <Badge variant="secondary">{question.category}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Question Text & Options */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Question</h4>
                    <p className="text-sm whitespace-pre-wrap mb-4">{question.question_text}</p>
                    
                    <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Options</h4>
                    <div className="space-y-2">
                      {question.options.map(option => (
                        <div 
                          key={option.id} 
                          className={`text-sm p-2 rounded border ${
                            option.is_correct 
                              ? 'bg-green-100 dark:bg-green-900/30 border-green-500/50' 
                              : 'border-transparent'
                          }`}
                        >
                          <strong>{option.option_letter}.</strong> {option.option_text}
                          {option.is_correct && (
                            <Badge variant="default" className="ml-2 text-xs">Correct</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation & Image Info */}
                  <div className="space-y-4">
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Explanation</h4>
                      {question.explanation ? (
                        <p className="text-sm whitespace-pre-wrap">{question.explanation}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No explanation extracted</p>
                      )}
                    </div>

                    {question.has_image && (
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Image Info</h4>
                        {question.image_description && (
                          <p className="text-sm mb-2">{question.image_description}</p>
                        )}
                        {question.question_image_url && (
                          <img 
                            src={question.question_image_url} 
                            alt="Question image" 
                            className="max-w-full h-auto rounded border"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t">
        <Button variant="outline" onClick={() => navigate('/admin/pdfs')}>
          Back to PDF List
        </Button>
        
        <div className="flex gap-4">
          {pdf?.status !== 'verified' && questions.length > 0 && (
            <Button onClick={markAsVerified}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Verified
            </Button>
          )}
          <Button variant="outline" onClick={goToNextPdf}>
            Next PDF
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PDFProcess;
