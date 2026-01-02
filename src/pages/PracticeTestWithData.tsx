import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
  Flag,
  Calculator,
  FileText,
  Maximize,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  X,
  Strikethrough,
  Pause,
  StickyNote,
  Save,
  Download,
  Menu,
  FlaskConical,
  Type,
  Settings,
  Contrast,
  BarChart3,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTests, Question, QuestionOption } from "@/hooks/useTests";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useConfetti } from "@/hooks/useConfetti";
import { exportNotesToText } from "@/utils/exportNotes";
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

  const handleExportNotes = () => {
    const notesArray = questions
      .filter((q) => questionNotes[q.id])
      .map((q) => ({
        questionText: q.question_text,
        note: questionNotes[q.id],
        subject: q.subject,
        system: q.system,
        timestamp: new Date().toISOString(),
      }));

    if (notesArray.length === 0) {
      toast.error("No notes to export");
      return;
    }

    exportNotesToText(notesArray, `Practice Test ${testId || "Session"}`);
    toast.success(`Exported ${notesArray.length} notes`);
  };

  const hasNote = currentQuestion && questionNotes[currentQuestion.id];
  const questionId = currentQuestion?.id?.slice(0, 8) || "------";
  const timeSpentOnQuestion = Math.round((Date.now() - startTime) / 1000);

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
        <div className="bg-card p-8 text-center rounded-lg shadow-md">
          <p className="text-muted-foreground mb-4">No questions available</p>
          <Button onClick={() => navigate("/qbank/create")}>Create a Test</Button>
        </div>
      </div>
    );
  }

  const correctOption = currentQuestion.options.find((opt) => opt.is_correct);
  const selectedOption = currentQuestion.options.find((o) => o.id === selectedAnswer);
  const isCorrectAnswer = selectedOption?.is_correct || false;

  // Toolbar button component for consistent styling
  const ToolbarButton = ({ 
    icon: Icon, 
    label, 
    onClick,
    active = false 
  }: { 
    icon: React.ElementType; 
    label: string; 
    onClick?: () => void;
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center px-2 py-1 hover:bg-primary/80 transition-colors min-w-[60px]",
        active && "bg-primary/80"
      )}
    >
      <Icon className="h-5 w-5 text-primary-foreground" />
      <span className="text-[10px] text-primary-foreground mt-0.5">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-card">
      {/* UWorld-style Header */}
      <header className="bg-primary flex items-center h-12 shadow-md">
        {/* Left section - Menu and Item info */}
        <div className="flex items-center">
          <button className="p-3 hover:bg-primary/80 transition-colors">
            <Menu className="h-5 w-5 text-primary-foreground" />
          </button>
          
          <div className="px-4 border-r border-primary-foreground/30">
            <div className="text-primary-foreground font-semibold text-sm">
              Item {currentIndex + 1} of {totalQuestions}
            </div>
            <div className="text-primary-foreground/70 text-xs">
              Question Id: {questionId}
            </div>
          </div>

          {/* Mark checkbox */}
          <div className="flex items-center gap-2 px-4 border-r border-primary-foreground/30">
            <Checkbox 
              id="mark" 
              checked={isMarked}
              onCheckedChange={() => handleMarkQuestion()}
              className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
            />
            <div className="flex items-center gap-1">
              <Flag className="h-4 w-4 text-destructive" />
              <label htmlFor="mark" className="text-primary-foreground text-sm cursor-pointer">
                Mark
              </label>
            </div>
          </div>

          {/* Navigation arrows */}
          <button 
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex flex-col items-center justify-center px-3 py-1 hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5 text-primary-foreground" />
            <span className="text-[10px] text-primary-foreground">Previous</span>
          </button>
          <button 
            onClick={handleNext}
            disabled={currentIndex === totalQuestions - 1}
            className="flex flex-col items-center justify-center px-3 py-1 hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5 text-primary-foreground" />
            <span className="text-[10px] text-primary-foreground">Next</span>
          </button>
        </div>

        {/* Right section - Tools */}
        <div className="flex items-center ml-auto">
          <ToolbarButton icon={Maximize} label="Full Screen" />
          <ToolbarButton icon={HelpCircle} label="Tutorial" />
          <ToolbarButton icon={FlaskConical} label="Lab Values" />
          <ToolbarButton icon={StickyNote} label="Notes" onClick={handleOpenNotes} active={!!hasNote} />
          <ToolbarButton icon={Calculator} label="Calculator" />
          <ToolbarButton icon={Contrast} label="Reverse Color" />
          <ToolbarButton icon={Type} label="Text Zoom" />
          <ToolbarButton icon={Settings} label="Settings" />
        </div>
      </header>

      {/* Main Content - Clean white background */}
      <main className="flex-1 overflow-auto p-6 lg:p-10">
        <div className="max-w-4xl mx-auto">
          {/* Question Text */}
          <div className="mb-8">
            <p className="text-foreground text-base leading-relaxed">
              {currentQuestion.question_text}
            </p>
          </div>

          {/* Answer Options in bordered box */}
          <div className="border border-border rounded-sm p-4 mb-6 bg-card">
            <RadioGroup
              value={selectedAnswer}
              onValueChange={setSelectedAnswer}
              className="space-y-2"
              disabled={isAnswered}
            >
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option.id;
                const isCorrectOpt = option.is_correct;
                const showResult = isAnswered;
                const isStruck = strikethroughOptions.includes(option.id);

                return (
                  <div
                    key={option.id}
                    className={cn(
                      "flex items-start gap-3 py-2 px-2 rounded transition-all",
                      !showResult && isSelected && "bg-primary/5",
                      showResult && isCorrectOpt && "bg-[hsl(var(--badge-success))]/10",
                      showResult && isSelected && !isCorrectOpt && "bg-destructive/10",
                      isStruck && "opacity-50"
                    )}
                  >
                    {/* Correct answer indicator */}
                    {showResult && isCorrectOpt && (
                      <Check className="h-5 w-5 text-[hsl(var(--badge-success))] shrink-0 mt-0.5" />
                    )}
                    
                    <div className="flex items-center gap-2">
                      <RadioGroupItem 
                        value={option.id} 
                        id={option.id} 
                        disabled={isAnswered}
                        className="shrink-0"
                      />
                    </div>

                    <Label
                      htmlFor={option.id}
                      className={cn(
                        "flex-1 cursor-pointer text-foreground leading-relaxed",
                        isStruck && "line-through"
                      )}
                    >
                      <span className="font-medium mr-2">{option.option_letter}.</span>
                      {option.option_text}
                    </Label>

                    {!isAnswered && (
                      <button
                        className="p-1 hover:bg-muted rounded shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleStrikethrough(option.id);
                        }}
                      >
                        <Strikethrough className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Submit / Proceed Button */}
          {!isAnswered && (
            <div className="flex justify-center">
              <Button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
                className="px-8 py-2"
              >
                Proceed To Next Item
              </Button>
            </div>
          )}

          {/* Results Section - UWorld style */}
          {isAnswered && (
            <div className="border border-border rounded-sm bg-muted/30 p-4 mb-6">
              <div className="flex flex-wrap items-center gap-6">
                {/* Status */}
                <div>
                  <div className={cn(
                    "text-sm font-medium",
                    isCorrectAnswer ? "text-[hsl(var(--badge-success))]" : "text-destructive"
                  )}>
                    {isCorrectAnswer ? "Correct" : "Omitted"}
                  </div>
                  <div className="text-xs text-muted-foreground">Correct answer</div>
                  <div className="text-sm font-semibold text-foreground">
                    {correctOption?.option_letter}
                  </div>
                </div>

                <Separator orientation="vertical" className="h-12 hidden sm:block" />

                {/* Stats */}
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">67%</div>
                    <div className="text-xs text-muted-foreground">Answered correctly</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {timeSpentOnQuestion < 10 ? `0${timeSpentOnQuestion}` : timeSpentOnQuestion} secs
                    </div>
                    <div className="text-xs text-muted-foreground">Time Spent</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">2024</div>
                    <div className="text-xs text-muted-foreground">Version</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explanation Section - UWorld style */}
          {showExplanation && currentQuestion.explanation && (
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Explanation</h3>
              <div className="prose prose-slate max-w-none">
                <p className="text-foreground leading-relaxed">{currentQuestion.explanation}</p>
              </div>
            </div>
          )}

          {/* Proceed button after answer */}
          {isAnswered && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleNext}
                disabled={currentIndex === totalQuestions - 1}
                className="px-8 py-2"
              >
                Proceed To Next Item
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - UWorld style */}
      <footer className="bg-primary h-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleEndTest}
            className="text-primary-foreground text-sm hover:underline flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            End
          </button>
          <button className="text-primary-foreground text-sm hover:underline flex items-center gap-1">
            <Pause className="h-4 w-4" />
            Suspend
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="text-primary-foreground text-sm hover:underline">
            Feedback
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="text-primary-foreground text-sm hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === totalQuestions - 1}
            className="text-primary-foreground text-sm hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
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
