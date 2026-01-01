import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  Undo2,
  Pause,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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
  const [currentQuestion] = useState(28);
  const [totalQuestions] = useState(40);
  const [timeRemaining] = useState("33:43");

  const handleSubmitAnswer = () => {
    if (selectedAnswer) {
      setIsAnswered(true);
      setShowExplanation(true);
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
      {/* Top Toolbar */}
      <header className="h-14 border-b border-border bg-sidebar flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setIsMarked(!isMarked)}
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
          >
            <Strikethrough className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <FileText className="h-5 w-5" />
          </Button>
        </div>

        {/* Center - Question Counter */}
        <div className="flex items-center gap-4">
          <span className="text-sidebar-foreground font-medium">
            {currentQuestion}/{totalQuestions}
          </span>
          <Button variant="ghost" size="sm" className="text-sidebar-foreground/80 text-xs">
            ▼
          </Button>
        </div>

        {/* Right Tools */}
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
            <span className="font-mono text-lg font-medium">{timeRemaining}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Question Card */}
          <Card className="shadow-sm">
            <CardContent className="p-6 lg:p-8">
              {/* Question Text */}
              <div className="prose prose-slate max-w-none mb-8">
                <p className="text-foreground text-base leading-relaxed">
                  {sampleQuestion.questionText}
                </p>
              </div>

              {/* Answer Options */}
              <RadioGroup
                value={selectedAnswer}
                onValueChange={setSelectedAnswer}
                className="space-y-3"
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
                        "relative flex items-start gap-4 p-4 rounded-lg border transition-all",
                        !showResult && isSelected && "border-primary bg-primary/5",
                        !showResult && !isSelected && "border-border hover:border-primary/50",
                        showResult && isCorrectAnswer && "border-[hsl(var(--badge-success))] bg-[hsl(var(--badge-success))]/10",
                        showResult && isSelected && !isCorrectAnswer && "border-destructive bg-destructive/10",
                        isStruck && "opacity-50"
                      )}
                    >
                      {/* Radio Button or Result Icon */}
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

              {/* Submit Button */}
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

          {/* Answer Feedback */}
          {isAnswered && (
            <Card className={cn(
              "border-l-4",
              selectedAnswer === correctOption?.id
                ? "border-l-[hsl(var(--badge-success))]"
                : "border-l-destructive"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedAnswer === correctOption?.id ? (
                      <>
                        <Badge className="bg-[hsl(var(--badge-success))] text-[hsl(var(--badge-success-foreground))]">
                          Correct
                        </Badge>
                        <span className="text-muted-foreground text-sm">▸</span>
                      </>
                    ) : (
                      <Badge variant="destructive">Incorrect</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="font-medium">59%</span>
                      <span>Answered correctly</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">36 secs</span>
                      <span>Time Spent</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Explanation Section */}
          {showExplanation && (
            <Card>
              <CardContent className="p-6 lg:p-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Explanation
                </h3>
                
                <div className="prose prose-slate max-w-none">
                  <p className="text-foreground leading-relaxed mb-6">
                    {sampleQuestion.explanation}
                  </p>
                </div>

                {/* Educational Images */}
                <div className="grid gap-6 md:grid-cols-2 mt-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground text-center">Normal sleep</h4>
                    <div className="bg-muted/30 rounded-lg p-4 aspect-video flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
                          <FlaskConical className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">Open<br />airway</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground text-center">Obstructive sleep apnea</h4>
                    <div className="bg-muted/30 rounded-lg p-4 aspect-video flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-destructive/20 flex items-center justify-center">
                          <X className="h-8 w-8 text-destructive" />
                        </div>
                        <p className="text-sm text-muted-foreground">Closed<br />airway</p>
                      </div>
                    </div>
                  </div>
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
            onClick={() => navigate("/qbank/history")}
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
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="ghost"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default PracticeTest;