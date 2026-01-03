import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Image, CheckCircle, AlertTriangle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuestionOption {
  id: string;
  option_letter: string;
  option_text: string;
  is_correct: boolean;
  explanation: string | null;
}

interface Question {
  id: string;
  question_text: string;
  explanation: string | null;
  question_image_url: string | null;
  explanation_image_url: string | null;
  has_image: boolean;
  category: string | null;
  subject: string;
  system: string;
  options: QuestionOption[];
}

interface QuestionImage {
  id: string;
  file_path: string;
  storage_url: string | null;
  source_type: string;
  position: string;
}

const QuestionReviewAdmin = () => {
  const { pdfId } = useParams<{ pdfId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionImages, setQuestionImages] = useState<Record<string, QuestionImage[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, [pdfId]);

  const loadQuestions = async () => {
    setLoading(true);
    
    let query = supabase
      .from('questions')
      .select(`
        *,
        options:question_options(*)
      `)
      .order('created_at', { ascending: true });

    if (pdfId) {
      query = query.eq('pdf_id', pdfId);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Failed to load questions", variant: "destructive" });
      setLoading(false);
      return;
    }

    setQuestions(data || []);

    // Load images for all questions
    if (data && data.length > 0) {
      const questionIds = data.map(q => q.id);
      const { data: images } = await supabase
        .from('question_images')
        .select('*')
        .in('question_id', questionIds);

      if (images) {
        const imagesByQuestion: Record<string, QuestionImage[]> = {};
        images.forEach(img => {
          if (!imagesByQuestion[img.question_id]) {
            imagesByQuestion[img.question_id] = [];
          }
          imagesByQuestion[img.question_id].push(img);
        });
        setQuestionImages(imagesByQuestion);
      }
    }

    setLoading(false);
  };

  const currentQuestion = questions[currentIndex];
  const currentImages = currentQuestion ? questionImages[currentQuestion.id] || [] : [];

  const handleImageUpload = async (position: 'inline' | 'explanation') => {
    if (!currentQuestion) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const filePath = `question-images/${currentQuestion.id}/${position}_${Date.now()}.${file.name.split('.').pop()}`;
      
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

      // Insert into question_images table
      const { error: insertError } = await supabase.from('question_images').insert({
        question_id: currentQuestion.id,
        file_path: filePath,
        storage_url: publicUrl,
        source_type: 'screenshot',
        position: position === 'inline' ? 'inline' : 'explanation'
      });

      if (insertError) {
        toast({ title: "Failed to save image reference", variant: "destructive" });
        return;
      }

      // Also update the question's image URL fields
      if (position === 'explanation') {
        await supabase.from('questions').update({
          explanation_image_url: publicUrl,
          has_image: true
        }).eq('id', currentQuestion.id);
      } else {
        await supabase.from('questions').update({
          question_image_url: publicUrl,
          has_image: true
        }).eq('id', currentQuestion.id);
      }

      toast({ title: "Image uploaded successfully" });
      loadQuestions();
    };
    input.click();
  };

  const hasValidation = (q: Question) => {
    const hasText = q.question_text && q.question_text.length > 10;
    const hasExplanation = q.explanation && q.explanation.length > 10;
    const hasOptions = q.options && q.options.length >= 2;
    return { hasText, hasExplanation, hasOptions };
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No questions found</h3>
            <p className="text-muted-foreground">Process a PDF first to add questions</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validation = hasValidation(currentQuestion);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Question Review</h1>
          <p className="text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
            disabled={currentIndex === questions.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Validation Status */}
      <div className="flex gap-2 mb-6">
        <Badge variant={validation.hasText ? 'default' : 'destructive'}>
          {validation.hasText ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
          Text
        </Badge>
        <Badge variant={validation.hasExplanation ? 'default' : 'destructive'}>
          {validation.hasExplanation ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
          Explanation
        </Badge>
        <Badge variant={validation.hasOptions ? 'default' : 'destructive'}>
          {validation.hasOptions ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
          Options ({currentQuestion.options?.length || 0})
        </Badge>
        <Badge variant={currentImages.length > 0 ? 'default' : 'secondary'}>
          <Image className="w-3 h-3 mr-1" />
          Images ({currentImages.length})
        </Badge>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Question Text (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Question Text (Read-Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="prose prose-sm dark:prose-invert">
                <p className="whitespace-pre-wrap">{currentQuestion.question_text}</p>
                
                <div className="mt-4 space-y-2">
                  {currentQuestion.options?.map(opt => (
                    <div 
                      key={opt.id}
                      className={`p-3 rounded-lg border ${
                        opt.is_correct 
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                          : 'bg-muted/50'
                      }`}
                    >
                      <strong>{opt.option_letter}.</strong> {opt.option_text}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Center: Images (Mandatory) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
              <span>Images (Mandatory)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleImageUpload('inline')}>
                  <Upload className="w-3 h-3 mr-1" /> Question
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleImageUpload('explanation')}>
                  <Upload className="w-3 h-3 mr-1" /> Explanation
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {currentImages.length === 0 && !currentQuestion.question_image_url && !currentQuestion.explanation_image_url ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Image className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No images attached</p>
                  <p className="text-sm text-muted-foreground">
                    Upload screenshots if this question requires images
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentQuestion.question_image_url && (
                    <div>
                      <Badge className="mb-2">Question Image</Badge>
                      <img 
                        src={currentQuestion.question_image_url} 
                        alt="Question" 
                        className="w-full rounded-lg border"
                      />
                    </div>
                  )}
                  {currentQuestion.explanation_image_url && (
                    <div>
                      <Badge className="mb-2">Explanation Image</Badge>
                      <img 
                        src={currentQuestion.explanation_image_url} 
                        alt="Explanation" 
                        className="w-full rounded-lg border"
                      />
                    </div>
                  )}
                  {currentImages.map(img => (
                    <div key={img.id}>
                      <Badge className="mb-2">{img.position} ({img.source_type})</Badge>
                      <img 
                        src={img.storage_url || ''} 
                        alt={img.position} 
                        className="w-full rounded-lg border"
                      />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Explanation (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Explanation (Read-Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="prose prose-sm dark:prose-invert">
                <p className="whitespace-pre-wrap">
                  {currentQuestion.explanation || 'No explanation available'}
                </p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, index) => {
              const v = hasValidation(q);
              const isComplete = v.hasText && v.hasExplanation && v.hasOptions;
              return (
                <Button
                  key={q.id}
                  size="sm"
                  variant={currentIndex === index ? 'default' : isComplete ? 'outline' : 'destructive'}
                  onClick={() => setCurrentIndex(index)}
                >
                  {index + 1}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionReviewAdmin;
