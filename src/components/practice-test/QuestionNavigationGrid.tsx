import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, X, Flag } from "lucide-react";

interface QuestionStatus {
  questionNumber: number;
  isAnswered: boolean;
  isCorrect?: boolean;
  isMarked: boolean;
}

interface QuestionNavigationGridProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuestionStatus[];
  currentQuestion: number;
  onQuestionSelect: (questionNumber: number) => void;
}

export function QuestionNavigationGrid({
  open,
  onOpenChange,
  questions,
  currentQuestion,
  onQuestionSelect,
}: QuestionNavigationGridProps) {
  const answered = questions.filter(q => q.isAnswered).length;
  const marked = questions.filter(q => q.isMarked).length;
  const unanswered = questions.filter(q => !q.isAnswered).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">Question Navigator</SheetTitle>
        </SheetHeader>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 mb-6">
          <div className="text-center p-2 rounded-lg bg-[hsl(var(--badge-success))]/10">
            <div className="text-lg font-bold text-[hsl(var(--badge-success))]">{answered}</div>
            <div className="text-xs text-muted-foreground">Answered</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-500/10">
            <div className="text-lg font-bold text-amber-500">{marked}</div>
            <div className="text-xs text-muted-foreground">Marked</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted">
            <div className="text-lg font-bold text-muted-foreground">{unanswered}</div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-primary bg-primary/20" />
            <span className="text-muted-foreground">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-[hsl(var(--badge-success))]" />
            <span className="text-muted-foreground">Correct</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-destructive" />
            <span className="text-muted-foreground">Incorrect</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-amber-500" />
            <span className="text-muted-foreground">Marked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-muted border border-border" />
            <span className="text-muted-foreground">Unanswered</span>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((question) => {
              const isCurrent = question.questionNumber === currentQuestion;
              
              let bgColor = "bg-muted hover:bg-muted/80";
              let textColor = "text-foreground";
              
              if (question.isAnswered) {
                if (question.isCorrect === true) {
                  bgColor = "bg-[hsl(var(--badge-success))] hover:bg-[hsl(var(--badge-success))]/80";
                  textColor = "text-[hsl(var(--badge-success-foreground))]";
                } else if (question.isCorrect === false) {
                  bgColor = "bg-destructive hover:bg-destructive/80";
                  textColor = "text-destructive-foreground";
                } else {
                  bgColor = "bg-primary/20 hover:bg-primary/30";
                  textColor = "text-primary";
                }
              }

              return (
                <Button
                  key={question.questionNumber}
                  variant="ghost"
                  className={cn(
                    "relative h-10 w-10 p-0 font-medium text-sm",
                    bgColor,
                    textColor,
                    isCurrent && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => {
                    onQuestionSelect(question.questionNumber);
                    onOpenChange(false);
                  }}
                >
                  {question.questionNumber}
                  {question.isMarked && (
                    <Flag className="absolute -top-1 -right-1 h-3 w-3 text-amber-500 fill-amber-500" />
                  )}
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="mt-4 space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start text-sm"
            onClick={() => {
              const firstUnanswered = questions.find(q => !q.isAnswered);
              if (firstUnanswered) {
                onQuestionSelect(firstUnanswered.questionNumber);
                onOpenChange(false);
              }
            }}
          >
            Go to first unanswered
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start text-sm"
            onClick={() => {
              const firstMarked = questions.find(q => q.isMarked);
              if (firstMarked) {
                onQuestionSelect(firstMarked.questionNumber);
                onOpenChange(false);
              }
            }}
          >
            Go to first marked
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
