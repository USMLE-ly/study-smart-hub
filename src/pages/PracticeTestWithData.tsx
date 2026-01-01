import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Bookmark,
  Calculator,
  FileText,
  Highlighter,
  FlaskConical,
  MessageSquare,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  BarChart3,
  Check,
  X,
  Strikethrough,
  Pause,
  StickyNote,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTests, Question, QuestionOption } from "@/hooks/useTests";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useConfetti } from "@/hooks/useConfetti";
import { toast } from "sonner";

interface QuestionWithOptions extends Question {
  options: QuestionOption[];
}

const PracticeTestWithData = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const { getTest, getTestAnswers, submitAnswer, markQuestion, completeTest } = useTests();
  const { saveWrongAnswerAsFlashcard } = useFlashcards();
  const { triggerConfetti, triggerStars } = useConfetti();
  
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [strikethroughOptions, setStrikethroughOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [testMode, setTestMode] = useState<"tutor" | "timed">("tutor");
  
  // Notes state
  const [notesOpen, setNotesOpen] = useState(false);
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>({});
  const [currentNote, setCurrentNote] = useState("");

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const loadTestData = useCallback(async () => {
    if (!testId) {
      // Load random questions if no test ID
      const { data: questionsData } = await supabase
        .from("questions")
        .select("*")
        .limit(10);

      if (questionsData) {
        const questionsWithOptions = await Promise.all(
          questionsData.map(async (q) => {
            const { data: options } = await supabase
              .from("question_options")
              .select("*")
              .eq("question_id", q.id);
            return { ...q, options: options || [] };
          })
        );
        setQuestions(questionsWithOptions);
      }
      setLoading(false);
      return;
    }

    const { data: test } = await getTest(testId);
    if (test) {
      setTestMode(test.mode as "tutor" | "timed");
      if (test.time_limit_seconds) {
        setTimeRemaining(test.time_limit_seconds - (test.time_spent_seconds || 0));
      }
    }

    const { data: answers } = await getTestAnswers(testId);
    if (answers && answers.length > 0) {
      const questionIds = answers.map((a) => a.question_id);
      const { data: questionsData } = await supabase
        .from("questions")
        .select("*")
        .in("id", questionIds);

      if (questionsData) {
        const questionsWithOptions = await Promise.all(
          questionsData.map(async (q) => {
            const { data: options } = await supabase
              .from("question_options")
              .select("*")
              .eq("question_id", q.id);
            return { ...q, options: options || [] };
          })
        );
        
        // Sort by question order
        const orderedQuestions = answers
          .sort((a, b) => a.question_order - b.question_order)
          .map((a) => questionsWithOptions.find((q) => q.id === a.question_id))
          .filter(Boolean) as QuestionWithOptions[];
        
        setQuestions(orderedQuestions);
      }
    }
    setLoading(false);
  }, [testId, getTest, getTestAnswers]);

  useEffect(() => {
    loadTestData();
  }, [loadTestData]);

  useEffect(() => {
    if (testMode === "timed" && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleEndTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [testMode, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return;

    const selectedOption = currentQuestion.options.find((o) => o.id === selectedAnswer);
    const isCorrect = selectedOption?.is_correct || false;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    if (testId) {
      await submitAnswer({
        testId,
        questionId: currentQuestion.id,
        questionOrder: currentIndex + 1,
        selectedOptionId: selectedAnswer,
        isCorrect,
        timeSpentSeconds: timeSpent,
      });
    }

    // Save wrong answers as flashcards automatically
    if (!isCorrect) {
      const correctOption = currentQuestion.options.find((o) => o.is_correct);
      if (correctOption) {
        await saveWrongAnswerAsFlashcard(
          currentQuestion.question_text,
          `${correctOption.option_letter}. ${correctOption.option_text}`,
          currentQuestion.explanation || undefined
        );
        toast.info("Question saved to your Wrong Answers deck", { duration: 2000 });
      }
    } else {
      // Celebrate correct answers!
      triggerStars();
      toast.success("Correct! 🎉", { duration: 1500 });
    }

    setIsAnswered(true);
    if (testMode === "tutor") {
      setShowExplanation(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetQuestionState();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      resetQuestionState();
    }
  };

  const resetQuestionState = () => {
    setSelectedAnswer("");
    setIsAnswered(false);
    setShowExplanation(false);
    setIsMarked(false);
    setStrikethroughOptions([]);
    setStartTime(Date.now());
  };

  const handleEndTest = async () => {
    if (testId) {
      await completeTest(testId);
      toast.success("Test completed!");
    }
    navigate("/qbank/history");
  };

  const toggleStrikethrough = (optionId: string) => {
    setStrikethroughOptions((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  const handleMarkQuestion = async () => {
    const newMarked = !isMarked;
    setIsMarked(newMarked);
    if (testId && currentQuestion) {
      await markQuestion(testId, currentQuestion.id, newMarked);
    }
  };

  const handleOpenNotes = () => {
    if (currentQuestion) {
      setCurrentNote(questionNotes[currentQuestion.id] || "");
    }
    setNotesOpen(true);
  };

  const handleSaveNote = () => {
    if (currentQuestion) {
      setQuestionNotes((prev) => ({
        ...prev,
        [currentQuestion.id]: currentNote,
      }));
      toast.success("Note saved");
    }
    setNotesOpen(false);
  };

  const hasNote = currentQuestion && questionNotes[currentQuestion.id];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingState message="Loading questions..." />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No questions available</p>
          <Button onClick={() => navigate("/qbank/create")}>Create a Test</Button>
        </Card>
      </div>
    );
  }

  const correctOption = currentQuestion.options.find((opt) => opt.is_correct);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Toolbar */}
      <header className="h-14 border-b border-border bg-sidebar flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleMarkQuestion}
          >
            <Bookmark className={cn("h-5 w-5", isMarked && "fill-current text-primary")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Highlighter className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleOpenNotes}
          >
            <StickyNote className={cn("h-5 w-5", hasNote && "fill-primary text-primary")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <FileText className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sidebar-foreground font-medium">
            {currentIndex + 1}/{totalQuestions}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Calculator className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <FlaskConical className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>

          <Separator orientation="vertical" className="h-6 bg-sidebar-border" />

          <div className="flex items-center gap-2 text-sidebar-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono text-lg font-medium">
              {testMode === "timed" ? formatTime(timeRemaining) : "--:--"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="shadow-sm animate-fade-in">
            <CardContent className="p-6 lg:p-8">
              <div className="prose prose-slate max-w-none mb-8">
                <p className="text-foreground text-base leading-relaxed">
                  {currentQuestion.question_text}
                </p>
              </div>

              <RadioGroup
                value={selectedAnswer}
                onValueChange={setSelectedAnswer}
                className="space-y-3"
                disabled={isAnswered}
              >
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const isCorrectAnswer = option.is_correct;
                  const showResult = isAnswered;
                  const isStruck = strikethroughOptions.includes(option.id);

                  return (
                    <div
                      key={option.id}
                      className={cn(
                        "relative flex items-start gap-4 p-4 rounded-lg border transition-all",
                        !showResult && isSelected && "border-primary bg-primary/5",
                        !showResult && !isSelected && "border-border hover:border-primary/50",
                        showResult && isCorrectAnswer && "border-[hsl(var(--badge-success))] bg-[hsl(var(--badge-success))]/10",
                        showResult && isSelected && !isCorrectAnswer && "border-destructive bg-destructive/10",
                        isStruck && "opacity-50"
                      )}
                    >
                      <div className="flex items-center justify-center w-6 h-6 mt-0.5">
                        {showResult ? (
                          isCorrectAnswer ? (
                            <div className="w-6 h-6 rounded-full bg-[hsl(var(--badge-success))] flex items-center justify-center">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          ) : isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                              <X className="h-4 w-4 text-destructive-foreground" />
                            </div>
                          ) : (
                            <RadioGroupItem value={option.id} id={option.id} disabled />
                          )
                        ) : (
                          <RadioGroupItem value={option.id} id={option.id} />
                        )}
                      </div>

                      <Label
                        htmlFor={option.id}
                        className={cn(
                          "flex-1 cursor-pointer text-foreground",
                          isStruck && "line-through"
                        )}
                      >
                        <span className="font-semibold mr-2">{option.option_letter}.</span>
                        {option.option_text}
                      </Label>

                      {!isAnswered && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleStrikethrough(option.id);
                          }}
                        >
                          <Strikethrough className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </RadioGroup>

              {!isAnswered && (
                <div className="flex justify-center mt-8">
                  <Button
                    size="lg"
                    className="px-12"
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer}
                  >
                    Submit Answer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {isAnswered && (
            <Card
              className={cn(
                "border-l-4 animate-fade-in",
                selectedAnswer === correctOption?.id
                  ? "border-l-[hsl(var(--badge-success))]"
                  : "border-l-destructive"
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedAnswer === correctOption?.id ? (
                      <Badge className="bg-[hsl(var(--badge-success))] text-[hsl(var(--badge-success-foreground))]">
                        Correct
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Incorrect</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">
                        {Math.round((Date.now() - startTime) / 1000)}s
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showExplanation && currentQuestion.explanation && (
            <Card className="animate-fade-in">
              <CardContent className="p-6 lg:p-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Explanation
                </h3>
                <div className="prose prose-slate max-w-none">
                  <p className="text-foreground leading-relaxed">{currentQuestion.explanation}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <footer className="h-14 border-t border-border bg-sidebar flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-2"
            onClick={handleEndTest}
          >
            <X className="h-4 w-4" />
            End
          </Button>
          <Button
            variant="ghost"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-2"
          >
            <Pause className="h-4 w-4" />
            Suspend
          </Button>
        </div>

        <Button
          variant="ghost"
          className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Feedback
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-2"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="ghost"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-2"
            onClick={handleNext}
            disabled={currentIndex === totalQuestions - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>

      {/* Notes Dialog */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-primary" />
              Question Notes
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Write your notes for this question..."
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Notes are saved locally for this session and will appear in your notebook.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveNote}>
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PracticeTestWithData;
