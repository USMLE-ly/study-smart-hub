import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/LoadingSpinner";
import {
  Flag,
  Calculator,
  Maximize,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  X,
  Strikethrough,
  Pause,
  Play,
  StickyNote,
  Menu,
  FlaskConical,
  Type,
  Settings,
  Contrast,
  BarChart3,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTests, Question, QuestionOption } from "@/hooks/useTests";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useConfetti } from "@/hooks/useConfetti";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LabValuesPanel } from "@/components/practice-test/LabValuesPanel";
import { CalculatorModal } from "@/components/practice-test/CalculatorModal";
import { QuestionNavigationGrid } from "@/components/practice-test/QuestionNavigationGrid";
import { NotesPanel } from "@/components/practice-test/NotesPanel";
import { FeedbackModal } from "@/components/practice-test/FeedbackModal";
import { useTestTimer } from "@/components/practice-test/TestTimer";
import { usePracticeTestKeyboard } from "@/hooks/usePracticeTestKeyboard";

interface QuestionWithOptions extends Question {
  options: QuestionOption[];
}

interface AnswerState {
  selectedOptionId: string | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
  isMarked: boolean;
}

const PracticeTestWithData = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const { user } = useAuth();
  const { getTest, getTestAnswers, submitAnswer, markQuestion, completeTest } = useTests();
  const { saveWrongAnswerAsFlashcard } = useFlashcards();
  const { triggerStars } = useConfetti();
  
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerStates, setAnswerStates] = useState<Record<string, AnswerState>>({});
  const [strikethroughOptions, setStrikethroughOptions] = useState<Record<string, string[]>>({});
  const [questionNotes, setQuestionNotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [testMode, setTestMode] = useState<"tutor" | "timed">("tutor");
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Panel states
  const [labValuesOpen, setLabValuesOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Timer
  const { timeRemaining, elapsedTime, isPaused, isExpired, toggle: togglePause, pause, resume } = 
    useTestTimer(3600, testMode);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const currentAnswerState = currentQuestion ? answerStates[currentQuestion.id] : null;
  const selectedAnswer = currentAnswerState?.selectedOptionId || "";
  const isAnswered = currentAnswerState?.isAnswered || false;
  const isMarked = currentAnswerState?.isMarked || false;

  // Load test data
  const loadTestData = useCallback(async () => {
    if (!testId) {
      // Quick mode - load random questions directly
      const { data: questionsData } = await supabase
        .from("questions")
        .select("*, question_options(*)")
        .limit(10);

      if (questionsData) {
        const formatted = questionsData.map((q: any) => ({
          ...q,
          options: q.question_options || [],
        }));
        setQuestions(formatted);
      }
      setLoading(false);
      return;
    }

    const { data: test } = await getTest(testId);
    if (test) {
      setTestMode(test.mode as "tutor" | "timed");
    }

    const { data: answers } = await getTestAnswers(testId);
    if (answers && answers.length > 0) {
      const questionIds = answers.map((a) => a.question_id);
      
      const { data: questionsData } = await supabase
        .from("questions")
        .select("*, question_options(*)")
        .in("id", questionIds);

      if (questionsData) {
        const formatted = questionsData.map((q: any) => ({
          ...q,
          options: q.question_options || [],
        }));
        
        // Order by test answers
        const orderedQuestions = answers
          .sort((a, b) => a.question_order - b.question_order)
          .map((a) => formatted.find((q) => q.id === a.question_id))
          .filter(Boolean) as QuestionWithOptions[];
        
        setQuestions(orderedQuestions);

        // Restore answer states
        const states: Record<string, AnswerState> = {};
        answers.forEach((a) => {
          if (a.selected_option_id) {
            states[a.question_id] = {
              selectedOptionId: a.selected_option_id,
              isAnswered: true,
              isCorrect: a.is_correct,
              isMarked: a.is_marked || false,
            };
          }
        });
        setAnswerStates(states);
      }
    }
    setLoading(false);
  }, [testId, getTest, getTestAnswers]);

  // Load user's notes for questions
  const loadUserNotes = useCallback(async () => {
    if (!user || questions.length === 0) return;
    
    const questionIds = questions.map(q => q.id);
    const { data } = await supabase
      .from("question_notes")
      .select("question_id")
      .eq("user_id", user.id)
      .in("question_id", questionIds);
    
    if (data) {
      setQuestionNotes(new Set(data.map(n => n.question_id)));
    }
  }, [user, questions]);

  useEffect(() => {
    loadTestData();
  }, [loadTestData]);

  useEffect(() => {
    loadUserNotes();
  }, [loadUserNotes]);

  // Handle time expiration
  useEffect(() => {
    if (isExpired) {
      handleEndTest();
    }
  }, [isExpired]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectAnswer = (optionId: string) => {
    if (!currentQuestion || isAnswered) return;
    
    setAnswerStates((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        selectedOptionId: optionId,
        isAnswered: false,
        isCorrect: null,
        isMarked: prev[currentQuestion.id]?.isMarked || false,
      },
    }));
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return;

    const selectedOption = currentQuestion.options.find((o) => o.id === selectedAnswer);
    const isCorrect = selectedOption?.is_correct || false;
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    // Update local state
    setAnswerStates((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        selectedOptionId: selectedAnswer,
        isAnswered: true,
        isCorrect,
        isMarked: prev[currentQuestion.id]?.isMarked || false,
      },
    }));

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
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleJumpToQuestion = (num: number) => {
    setCurrentIndex(num - 1);
    setQuestionStartTime(Date.now());
  };

  const handleEndTest = async () => {
    if (testId) {
      await completeTest(testId);
      toast.success("Test completed!");
    }
    navigate("/qbank/history");
  };

  const handleSuspend = () => {
    togglePause();
    toast.info(isPaused ? "Test resumed" : "Test suspended - timer paused");
  };

  const toggleStrikethrough = (optionId: string) => {
    if (!currentQuestion) return;
    setStrikethroughOptions((prev) => ({
      ...prev,
      [currentQuestion.id]: prev[currentQuestion.id]?.includes(optionId)
        ? prev[currentQuestion.id].filter((id) => id !== optionId)
        : [...(prev[currentQuestion.id] || []), optionId],
    }));
  };

  const handleMarkQuestion = async () => {
    if (!currentQuestion) return;
    const newMarked = !isMarked;
    
    setAnswerStates((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        selectedOptionId: prev[currentQuestion.id]?.selectedOptionId || null,
        isAnswered: prev[currentQuestion.id]?.isAnswered || false,
        isCorrect: prev[currentQuestion.id]?.isCorrect || null,
        isMarked: newMarked,
      },
    }));

    if (testId) {
      await markQuestion(testId, currentQuestion.id, newMarked);
    }
  };

  const handleNoteSaved = () => {
    if (currentQuestion) {
      setQuestionNotes((prev) => new Set([...prev, currentQuestion.id]));
    }
  };

  // Question navigation statuses
  const questionStatuses = useMemo(() => 
    questions.map((q, i) => ({
      questionNumber: i + 1,
      isAnswered: answerStates[q.id]?.isAnswered || false,
      isCorrect: answerStates[q.id]?.isCorrect ?? undefined,
      isMarked: answerStates[q.id]?.isMarked || false,
    })),
    [questions, answerStates]
  );

  const currentStrikethroughs = currentQuestion ? strikethroughOptions[currentQuestion.id] || [] : [];
  const hasNote = currentQuestion && questionNotes.has(currentQuestion.id);
  const questionId = currentQuestion?.id?.slice(0, 8) || "------";
  const timeSpentOnQuestion = Math.round((Date.now() - questionStartTime) / 1000);

  // Handle keyboard option selection
  const handleKeyboardSelectOption = useCallback((index: number) => {
    if (!currentQuestion || isAnswered) return;
    const option = currentQuestion.options[index];
    if (option) {
      handleSelectAnswer(option.id);
    }
  }, [currentQuestion, isAnswered]);

  // Keyboard shortcuts
  usePracticeTestKeyboard({
    onPrevious: handlePrevious,
    onNext: handleNext,
    onSelectOption: handleKeyboardSelectOption,
    onSubmit: handleSubmitAnswer,
    optionsCount: currentQuestion?.options.length || 0,
    canSubmit: !!selectedAnswer,
    isAnswered,
    enabled: !loading && !!currentQuestion,
  });

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

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-[#005BAC] flex items-center h-14 shadow-md shrink-0">
        {/* Left section */}
        <div className="flex items-center h-full">
          <button 
            onClick={() => setNavigationOpen(true)}
            className="h-full px-3 hover:bg-[#004A8C] transition-colors flex items-center justify-center"
          >
            <Menu className="h-5 w-5 text-white" />
          </button>
          
          <div className="px-3 h-full flex flex-col justify-center border-r border-white/20">
            <div className="text-white font-semibold text-sm leading-tight">
              Item {currentIndex + 1} of {totalQuestions}
            </div>
            <div className="text-white/70 text-xs leading-tight">
              Question Id: {questionId}
            </div>
          </div>

          {/* Mark checkbox */}
          <div className="flex items-center gap-2 px-3 h-full border-r border-white/20">
            <Checkbox 
              id="mark" 
              checked={isMarked}
              onCheckedChange={() => handleMarkQuestion()}
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#005BAC]"
            />
            <div className="flex items-center gap-1">
              <Flag className="h-4 w-4 text-red-400" />
              <label htmlFor="mark" className="text-white text-sm cursor-pointer">
                Mark
              </label>
            </div>
          </div>

          {/* Navigation arrows */}
          <button 
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="h-full flex flex-col items-center justify-center px-3 hover:bg-[#004A8C] transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
            <span className="text-[10px] text-white leading-tight">Previous</span>
          </button>
          <button 
            onClick={handleNext}
            disabled={currentIndex === totalQuestions - 1}
            className="h-full flex flex-col items-center justify-center px-3 hover:bg-[#004A8C] transition-colors disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5 text-white" />
            <span className="text-[10px] text-white leading-tight">Next</span>
          </button>
        </div>

        {/* Timer - center */}
        <div className="flex items-center gap-2 px-4 h-full border-l border-white/20">
          <Clock className={cn("h-4 w-4 text-white", isPaused && "opacity-50")} />
          <span className={cn(
            "font-mono font-semibold text-white text-sm",
            testMode === "timed" && timeRemaining < 300 && "text-red-300 animate-pulse"
          )}>
            {testMode === "timed" ? formatTime(timeRemaining) : formatTime(elapsedTime)}
          </span>
          {isPaused && <span className="text-xs text-white/70">PAUSED</span>}
        </div>

        {/* Right section - Tools */}
        <div className="flex items-center ml-auto h-full">
          <button className="h-full flex flex-col items-center justify-center px-2 hover:bg-[#004A8C] transition-colors min-w-[56px]">
            <Maximize className="h-5 w-5 text-white" />
            <span className="text-[10px] text-white leading-tight">Full Screen</span>
          </button>
          <button className="h-full flex flex-col items-center justify-center px-2 hover:bg-[#004A8C] transition-colors min-w-[56px]">
            <HelpCircle className="h-5 w-5 text-white" />
            <span className="text-[10px] text-white leading-tight">Tutorial</span>
          </button>
          <button 
            onClick={() => setLabValuesOpen(true)}
            className="h-full flex flex-col items-center justify-center px-2 hover:bg-[#004A8C] transition-colors min-w-[56px]"
          >
            <FlaskConical className="h-5 w-5 text-white" />
            <span className="text-[10px] text-white leading-tight">Lab Values</span>
          </button>
          <button 
            onClick={() => setNotesOpen(true)}
            className={cn(
              "h-full flex flex-col items-center justify-center px-2 hover:bg-[#004A8C] transition-colors min-w-[56px]",
              hasNote && "bg-[#004A8C]"
            )}
          >
            <StickyNote className="h-5 w-5 text-white" />
            <span className="text-[10px] text-white leading-tight">Notes</span>
          </button>
          <button 
            onClick={() => setCalculatorOpen(true)}
            className="h-full flex flex-col items-center justify-center px-2 hover:bg-[#004A8C] transition-colors min-w-[56px]"
          >
            <Calculator className="h-5 w-5 text-white" />
            <span className="text-[10px] text-white leading-tight">Calculator</span>
          </button>
          <button className="h-full flex flex-col items-center justify-center px-2 hover:bg-[#004A8C] transition-colors min-w-[56px]">
            <Contrast className="h-5 w-5 text-white" />
            <span className="text-[10px] text-white leading-tight whitespace-nowrap">Reverse Color</span>
          </button>
          <button className="h-full flex flex-col items-center justify-center px-2 hover:bg-[#004A8C] transition-colors min-w-[56px]">
            <Type className="h-5 w-5 text-white" />
            <span className="text-[10px] text-white leading-tight">Text Zoom</span>
          </button>
          <button className="h-full flex flex-col items-center justify-center px-2 hover:bg-[#004A8C] transition-colors min-w-[56px]">
            <Settings className="h-5 w-5 text-white" />
            <span className="text-[10px] text-white leading-tight">Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Question Text */}
          <div className="mb-8">
            <p className="text-gray-900 text-base leading-relaxed">
              {currentQuestion.question_text}
            </p>
            
            {/* Question Image */}
            {currentQuestion.question_image_url && (
              <div className="mt-4">
                <img 
                  src={currentQuestion.question_image_url} 
                  alt="Question diagram" 
                  className="max-w-full h-auto rounded-lg border border-border shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Answer Options */}
          <div className="border-2 border-[#B8D4E8] p-4 mb-6 bg-white">
            <RadioGroup
              value={selectedAnswer}
              onValueChange={handleSelectAnswer}
              className="space-y-0"
              disabled={isAnswered}
            >
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option.id;
                const isCorrectOpt = option.is_correct;
                const showResult = isAnswered;
                const isStruck = currentStrikethroughs.includes(option.id);

                return (
                  <div
                    key={option.id}
                    className={cn(
                      "flex items-center gap-3 py-3 px-3 border-b border-gray-100 last:border-b-0 transition-all",
                      !showResult && isSelected && "bg-blue-50",
                      showResult && isCorrectOpt && "bg-green-50",
                      showResult && isSelected && !isCorrectOpt && "bg-red-50",
                      isStruck && "opacity-50"
                    )}
                  >
                    {showResult && isCorrectOpt && (
                      <Check className="h-5 w-5 text-green-600 shrink-0" />
                    )}
                    
                    <RadioGroupItem 
                      value={option.id} 
                      id={option.id} 
                      disabled={isAnswered}
                      className="shrink-0 border-gray-400 data-[state=checked]:border-[#005BAC] data-[state=checked]:text-[#005BAC]"
                    />

                    <Label
                      htmlFor={option.id}
                      className={cn(
                        "flex-1 cursor-pointer text-gray-900 leading-relaxed",
                        isStruck && "line-through"
                      )}
                    >
                      <span className="font-medium mr-2">{option.option_letter}.</span>
                      {option.option_text}
                    </Label>

                    {!isAnswered && (
                      <button
                        className="p-1 hover:bg-gray-100 rounded shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleStrikethrough(option.id);
                        }}
                      >
                        <Strikethrough className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Submit Button */}
          {!isAnswered && (
            <div className="flex justify-center">
              <Button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
                className="px-8 py-2.5 bg-[#005BAC] hover:bg-[#004A8C] text-white font-medium"
              >
                Proceed To Next Item
              </Button>
            </div>
          )}

          {/* Results Section */}
          {isAnswered && (
            <div className="border border-border rounded-sm bg-muted/30 p-4 mb-6">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className={cn(
                    "text-sm font-medium",
                    isCorrectAnswer ? "text-[hsl(var(--badge-success))]" : "text-destructive"
                  )}>
                    {isCorrectAnswer ? "Correct" : "Incorrect"}
                  </div>
                  <div className="text-xs text-muted-foreground">Correct answer</div>
                  <div className="text-sm font-semibold text-foreground">
                    {correctOption?.option_letter}
                  </div>
                </div>

                <Separator orientation="vertical" className="h-12 hidden sm:block" />

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
                      {timeSpentOnQuestion} secs
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

          {/* Explanation Section - Always show after answering */}
          {isAnswered && (currentQuestion.explanation || currentQuestion.explanation_image_url) && (
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Explanation</h3>
              
              {/* Explanation Image */}
              {currentQuestion.explanation_image_url && (
                <div className="mb-4">
                  <img 
                    src={currentQuestion.explanation_image_url} 
                    alt="Explanation diagram" 
                    className="max-w-full h-auto rounded-lg border border-border shadow-sm"
                  />
                </div>
              )}
              
              <div className="prose prose-slate max-w-none">
                <p className="text-foreground leading-relaxed whitespace-pre-line">{currentQuestion.explanation}</p>
              </div>
              
              {/* Show all option explanations */}
              {currentQuestion.options.some(opt => opt.explanation) && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-md font-semibold text-foreground">Answer Choices Explained</h4>
                  {currentQuestion.options.map((option) => (
                    <div 
                      key={option.id} 
                      className={cn(
                        "p-3 rounded-lg border",
                        option.is_correct 
                          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" 
                          : option.id === selectedAnswer 
                            ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                            : "bg-muted/30 border-border"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "font-semibold",
                          option.is_correct ? "text-green-700 dark:text-green-400" : "text-foreground"
                        )}>
                          {option.option_letter}. {option.option_text}
                        </span>
                        {option.is_correct && (
                          <Badge variant="outline" className="text-green-700 border-green-300 dark:text-green-400">
                            Correct
                          </Badge>
                        )}
                        {option.id === selectedAnswer && !option.is_correct && (
                          <Badge variant="outline" className="text-red-700 border-red-300 dark:text-red-400">
                            Your Answer
                          </Badge>
                        )}
                      </div>
                      {option.explanation && (
                        <p className="text-sm text-muted-foreground mt-1">{option.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Proceed button after answer */}
          {isAnswered && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleNext}
                disabled={currentIndex === totalQuestions - 1}
                className="px-8 py-2 bg-[#005BAC] hover:bg-[#004A8C]"
              >
                Proceed To Next Item
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#005BAC] h-12 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={handleEndTest}
            className="text-white text-sm hover:underline flex items-center gap-1.5 font-medium"
          >
            <X className="h-4 w-4" />
            End
          </button>
          <button 
            onClick={handleSuspend}
            className="text-white text-sm hover:underline flex items-center gap-1.5 font-medium"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isPaused ? "Resume" : "Suspend"}
          </button>
        </div>

        <div className="flex items-center">
          <button 
            onClick={() => setFeedbackOpen(true)}
            className="text-white text-sm hover:underline font-medium flex items-center gap-1.5"
          >
            <MessageSquare className="h-4 w-4" />
            Feedback
          </button>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="text-white text-sm hover:underline flex items-center gap-1 font-medium disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === totalQuestions - 1}
            className="text-white text-sm hover:underline flex items-center gap-1 font-medium disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {/* Panels and Modals */}
      <LabValuesPanel open={labValuesOpen} onOpenChange={setLabValuesOpen} />
      <CalculatorModal open={calculatorOpen} onOpenChange={setCalculatorOpen} />
      <QuestionNavigationGrid
        open={navigationOpen}
        onOpenChange={setNavigationOpen}
        questions={questionStatuses}
        currentQuestion={currentIndex + 1}
        onQuestionSelect={handleJumpToQuestion}
      />
      <NotesPanel
        open={notesOpen}
        onOpenChange={setNotesOpen}
        currentQuestionId={currentQuestion.id}
        currentQuestionText={currentQuestion.question_text}
        testId={testId}
        onNoteSaved={handleNoteSaved}
      />
      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        questionId={currentQuestion.id}
        questionText={currentQuestion.question_text}
      />
    </div>
  );
};

export default PracticeTestWithData;
