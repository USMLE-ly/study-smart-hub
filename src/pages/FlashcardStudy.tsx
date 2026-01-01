import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFlashcards, Flashcard } from "@/hooks/useFlashcards";
import { ArrowLeft, RotateCcw, Check, X, Box } from "lucide-react";
import { cn } from "@/lib/utils";

const FlashcardStudy = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { getDueFlashcards, recordAnswer } = useFlashcards();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [progressMap, setProgressMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const loadCards = async () => {
      if (!deckId) return;
      setIsLoading(true);
      const { data, progressMap: pm } = await getDueFlashcards(deckId);
      if (data) {
        setCards(data);
        setProgressMap(pm || new Map());
      }
      setIsLoading(false);
    };
    loadCards();
  }, [deckId]);

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;
  const cardProgress = currentCard ? progressMap.get(currentCard.id) : null;

  const handleAnswer = async (isCorrect: boolean) => {
    if (!currentCard) return;

    await recordAnswer(currentCard.id, isCorrect);

    setSessionStats((prev) => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      incorrect: isCorrect ? prev.incorrect : prev.incorrect + 1,
    }));

    // Move to next card
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 300);
    } else {
      // Session complete
      setCurrentIndex(cards.length);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  // Session complete
  if (currentIndex >= cards.length || cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(var(--badge-success))]/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-[hsl(var(--badge-success))]" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {cards.length === 0 ? "No Cards Due" : "Session Complete!"}
            </h2>
            <p className="text-muted-foreground">
              {cards.length === 0
                ? "All cards have been reviewed. Check back later for more practice."
                : `You reviewed ${cards.length} cards this session.`}
            </p>
          </div>

          {cards.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-[hsl(var(--badge-success))]/10">
                <p className="text-3xl font-bold text-[hsl(var(--badge-success))]">
                  {sessionStats.correct}
                </p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10">
                <p className="text-3xl font-bold text-destructive">
                  {sessionStats.incorrect}
                </p>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={() => navigate("/flashcards")} className="w-full">
              Back to Flashcards
            </Button>
            {cards.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setSessionStats({ correct: 0, incorrect: 0 });
                }}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Study Again
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/flashcards")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit
        </Button>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {cards.length}
          </span>
          <div className="w-32">
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Box className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">
            Box {cardProgress?.box_number || 1}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Flashcard */}
          <div
            className="perspective-1000 cursor-pointer mb-8"
            onClick={handleFlip}
          >
            <div
              className={cn(
                "relative w-full aspect-[4/3] transition-transform duration-500 transform-style-preserve-3d",
                isFlipped && "rotate-y-180"
              )}
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front */}
              <Card
                className={cn(
                  "absolute inset-0 p-8 flex flex-col items-center justify-center backface-hidden",
                  "bg-card border-2 border-border shadow-lg"
                )}
                style={{ backfaceVisibility: "hidden" }}
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
                  Question
                </p>
                <p className="text-xl text-center text-foreground leading-relaxed">
                  {currentCard?.front_content}
                </p>
                <p className="text-sm text-muted-foreground mt-8">
                  Click to flip
                </p>
              </Card>

              {/* Back */}
              <Card
                className={cn(
                  "absolute inset-0 p-8 flex flex-col items-center justify-center",
                  "bg-primary/5 border-2 border-primary shadow-lg"
                )}
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <p className="text-xs uppercase tracking-wide text-primary mb-4">
                  Answer
                </p>
                <p className="text-xl text-center text-foreground leading-relaxed">
                  {currentCard?.back_content}
                </p>
              </Card>
            </div>
          </div>

          {/* Answer Buttons */}
          {isFlipped && (
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 max-w-xs h-14 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleAnswer(false)}
              >
                <X className="h-5 w-5 mr-2" />
                Didn't Know
              </Button>
              <Button
                size="lg"
                className="flex-1 max-w-xs h-14 bg-[hsl(var(--badge-success))] hover:bg-[hsl(var(--badge-success))]/90"
                onClick={() => handleAnswer(true)}
              >
                <Check className="h-5 w-5 mr-2" />
                Got It!
              </Button>
            </div>
          )}

          {/* Leitner Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {isFlipped
                ? "How well did you know this card?"
                : "Think of the answer, then click to reveal"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FlashcardStudy;