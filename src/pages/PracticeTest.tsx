import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Play,
  Menu,
  Maximize,
  Settings,
  ZoomIn,
  Palette,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { LabValuesPanel } from "@/components/practice-test/LabValuesPanel";
import { CalculatorModal } from "@/components/practice-test/CalculatorModal";
import { QuestionNavigationGrid } from "@/components/practice-test/QuestionNavigationGrid";
import { useTestTimer } from "@/components/practice-test/TestTimer";

interface AnswerOption {
  id: string;
  letter: string;
  text: string;
  percentage?: number;
  isCorrect?: boolean;
}

interface Question {
  id: number;
  questionText: string;
  options: AnswerOption[];
  explanation?: string;
  explanationImage?: string;
}

const sampleQuestion: Question = {
  id: 28,
  questionText: `A 57-year-old man comes to the office due to unrefreshing sleep. He feels tired during the day and occasionally has to nap during his lunch hours. According to his wife, the patient snores loudly during sleep and frequently gasps for breath. He also has severe claustrophobia. Past medical history is significant for hypertension. The patient takes no sedative medications and is a lifetime nonsmoker. Blood pressure is 156/94 mm Hg and BMI is 30 kg/m². Physical examination is significant for a bulky tongue and crowded, narrow oropharynx. Electrical stimulation of which of the following nerves may improve the pathophysiologic cause of this patient's symptoms?`,
  options: [
    { id: "a", letter: "A", text: "Hypoglossal (59%)", percentage: 59, isCorrect: true },
    { id: "b", letter: "B", text: "Lingual (4%)", percentage: 4 },
    { id: "c", letter: "C", text: "Maxillary (1%)", percentage: 1 },
    { id: "d", letter: "D", text: "Phrenic (16%)", percentage: 16 },
    { id: "e", letter: "E", text: "Recurrent laryngeal (18%)", percentage: 18 },
  ],
  explanation: `This patient has obstructive sleep apnea (OSA), characterized by recurrent episodes of upper airway collapse during sleep. The hypoglossal nerve innervates the genioglossus muscle, which protrudes the tongue and helps maintain airway patency during sleep.`,
};

const PracticeTest = () => {
  const navigate = useNavigate();
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [strikethroughOptions, setStrikethroughOptions] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [totalQuestions] = useState(10);
  
  // Panel states
  const [labValuesOpen, setLabValuesOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);

  // Timer
  const { elapsedTime, isPaused, toggle: togglePause } = useTestTimer(0, "tutor");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Mock question statuses for navigation
  const questionStatuses = useMemo(() => 
    Array.from({ length: totalQuestions }, (_, i) => ({
      questionNumber: i + 1,
      isAnswered: i < currentQuestion - 1 || (i === currentQuestion - 1 && isAnswered),
      isCorrect: i < currentQuestion - 1 ? Math.random() > 0.3 : undefined,
      isMarked: i === 2 || i === 5,
    })),
    [totalQuestions, currentQuestion, isAnswered]
  );

  const handleSubmitAnswer = () => {
    if (selectedAnswer) {
      setIsAnswered(true);
      setShowExplanation(true);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer("");
      setIsAnswered(false);
      setShowExplanation(false);
      setIsMarked(false);
      setStrikethroughOptions([]);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedAnswer("");
      setIsAnswered(false);
      setShowExplanation(false);
      setIsMarked(false);
      setStrikethroughOptions([]);
    }
  };

  const toggleStrikethrough = (optionId: string) => {
    setStrikethroughOptions(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const correctOption = sampleQuestion.options.find(opt => opt.isCorrect);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header Bar - USMLE Style */}
      <header className="bg-[#005BAC] text-white">
        {/* Top row with item info and toolbar */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-white/20">
          {/* Left - Menu and Item Info */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setNavigationOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="text-sm">
              <span className="font-bold">Item {currentQuestion}</span>
              <span className="opacity-80"> of {totalQuestions}</span>
            </div>
            <div className="text-xs opacity-70">
              Question Id:
            </div>
          </div>

          {/* Center - Mark checkbox, Navigation, Timer */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 gap-1"
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox
                id="mark"
                checked={isMarked}
                onCheckedChange={(checked) => setIsMarked(checked as boolean)}
                className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#005BAC]"
              />
              <Label htmlFor="mark" className="text-white text-sm cursor-pointer">
                Mark
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 gap-1"
              onClick={handleNextQuestion}
              disabled={currentQuestion === totalQuestions}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Timer */}
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded">
              <Clock className={cn("h-4 w-4", isPaused && "opacity-50")} />
              <span className="font-mono font-semibold text-sm">
                {formatTime(elapsedTime)}
              </span>
              {isPaused && <span className="text-xs opacity-70">PAUSED</span>}
            </div>
          </div>

          {/* Right - Toolbar Icons */}
          <div className="flex items-center gap-1">
            <ToolbarIcon icon={Maximize} label="Full Screen" />
            <ToolbarIcon icon={HelpCircle} label="Tutorial" />
            <ToolbarIcon icon={FlaskConical} label="Lab Values" onClick={() => setLabValuesOpen(true)} />
            <ToolbarIcon icon={StickyNote} label="Notes" />
            <ToolbarIcon icon={Calculator} label="Calculator" onClick={() => setCalculatorOpen(true)} />
            <ToolbarIcon icon={Palette} label="Reverse Color" />
            <ToolbarIcon icon={ZoomIn} label="Text Zoom" />
            <ToolbarIcon icon={Settings} label="Settings" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 lg:p-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Question Card */}
          <div className="space-y-4">
            {/* Question Text */}
            <div className="text-foreground text-base leading-relaxed">
              {sampleQuestion.questionText}
            </div>

            {/* Answer Options Box */}
            <div className="border-2 border-[#B8D4E8] rounded p-4">
              <RadioGroup
                value={selectedAnswer}
                onValueChange={setSelectedAnswer}
                className="space-y-2"
                disabled={isAnswered}
              >
                {sampleQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const isCorrectAnswer = option.isCorrect;
                  const showResult = isAnswered;
                  const isStruck = strikethroughOptions.includes(option.id);

                  return (
                    <div
                      key={option.id}
                      className={cn(
                        "relative flex items-center gap-3 p-3 rounded transition-all",
                        !showResult && isSelected && "bg-[#B8D4E8]/30",
                        showResult && isCorrectAnswer && "bg-[hsl(var(--badge-success))]/20",
                        showResult && isSelected && !isCorrectAnswer && "bg-destructive/20",
                        isStruck && "opacity-50"
                      )}
                    >
                      {/* Radio or Result Icon */}
                      <div className="flex items-center justify-center w-6 h-6">
                        {showResult ? (
                          isCorrectAnswer ? (
                            <div className="w-6 h-6 rounded-full bg-[hsl(var(--badge-success))] flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          ) : isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                              <X className="h-4 w-4 text-white" />
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
                        <span className="font-semibold mr-2">{option.letter}.</span>
                        {option.text}
                      </Label>

                      {/* Strikethrough Toggle */}
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
            </div>

            {/* Submit / Proceed Button */}
            <div className="flex justify-center pt-4">
              {!isAnswered ? (
                <Button
                  className="bg-[#005BAC] hover:bg-[#004a8c] text-white px-8 py-2"
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  className="bg-[#005BAC] hover:bg-[#004a8c] text-white px-8 py-2"
                  onClick={handleNextQuestion}
                  disabled={currentQuestion === totalQuestions}
                >
                  Proceed To Next Item
                </Button>
              )}
            </div>
          </div>

          {/* Answer Stats - shown after answering */}
          {isAnswered && (
            <div className="flex items-center gap-8 py-4 border-t border-border">
              <div>
                <span className={cn(
                  "font-bold text-lg",
                  selectedAnswer === correctOption?.id ? "text-[hsl(var(--badge-success))]" : "text-destructive"
                )}>
                  {selectedAnswer === correctOption?.id ? "Correct" : "Incorrect"}
                </span>
                <div className="text-sm text-muted-foreground">
                  Correct answer<br />
                  <span className="font-semibold text-foreground">{correctOption?.letter}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="font-bold">67%</span>
                  <div className="text-xs text-muted-foreground">Answered correctly</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="font-bold">102 secs</span>
                  <div className="text-xs text-muted-foreground">Time Spent</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="font-bold">2024</span>
                  <div className="text-xs text-muted-foreground">Version</div>
                </div>
              </div>
            </div>
          )}

          {/* Explanation Section */}
          {showExplanation && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-lg font-bold text-foreground mb-4">Explanation</h3>
              <div className="prose prose-slate max-w-none">
                <p className="text-foreground leading-relaxed">
                  {sampleQuestion.explanation}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - USMLE Style */}
      <footer className="bg-[#005BAC] text-white flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20 gap-2"
            onClick={() => navigate("/qbank/history")}
          >
            <X className="h-4 w-4" />
            End
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20 gap-2"
            onClick={togglePause}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isPaused ? "Resume" : "Suspend"}
          </Button>
        </div>

        <Button
          variant="ghost"
          className="text-white hover:bg-white/20 gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Feedback
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20 gap-2"
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20 gap-2"
            onClick={handleNextQuestion}
            disabled={currentQuestion === totalQuestions}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>

      {/* Panels and Modals */}
      <LabValuesPanel open={labValuesOpen} onOpenChange={setLabValuesOpen} />
      <CalculatorModal open={calculatorOpen} onOpenChange={setCalculatorOpen} />
      <QuestionNavigationGrid
        open={navigationOpen}
        onOpenChange={setNavigationOpen}
        questions={questionStatuses}
        currentQuestion={currentQuestion}
        onQuestionSelect={(num) => {
          setCurrentQuestion(num);
          setSelectedAnswer("");
          setIsAnswered(false);
          setShowExplanation(false);
          setIsMarked(false);
          setStrikethroughOptions([]);
        }}
      />
    </div>
  );
};

// Toolbar Icon Component
const ToolbarIcon = ({ 
  icon: Icon, 
  label, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-0.5 px-2 py-1 hover:bg-white/20 rounded transition-colors min-w-[50px]"
  >
    <Icon className="h-5 w-5" />
    <span className="text-[10px] leading-tight whitespace-nowrap">{label}</span>
  </button>
);

export default PracticeTest;