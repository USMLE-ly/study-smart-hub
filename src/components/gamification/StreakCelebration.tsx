import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Star, X } from "lucide-react";
import { useConfetti } from "@/hooks/useConfetti";
import { cn } from "@/lib/utils";

interface StreakCelebrationProps {
  streak: number;
  onClose: () => void;
}

const milestones = [
  { days: 7, title: "Week Warrior!", message: "You've studied for a whole week!", icon: Flame, color: "text-orange-500" },
  { days: 30, title: "Monthly Master!", message: "30 days of consistent studying!", icon: Trophy, color: "text-yellow-500" },
  { days: 100, title: "Century Champion!", message: "100 days! You're unstoppable!", icon: Star, color: "text-purple-500" },
];

export function StreakCelebration({ streak, onClose }: StreakCelebrationProps) {
  const { triggerFireworks } = useConfetti();
  const [isVisible, setIsVisible] = useState(false);

  const milestone = milestones.find((m) => m.days === streak);

  useEffect(() => {
    if (milestone) {
      setIsVisible(true);
      triggerFireworks();
    }
  }, [milestone, triggerFireworks]);

  if (!milestone || !isVisible) return null;

  const IconComponent = milestone.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="relative max-w-md w-full mx-4 p-8 text-center animate-scale-in">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className={cn(
          "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse"
        )}>
          <IconComponent className={cn("h-10 w-10", milestone.color)} />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {milestone.title}
        </h2>
        
        <p className="text-muted-foreground mb-4">
          {milestone.message}
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="text-3xl font-bold text-foreground">{streak}</span>
          <span className="text-muted-foreground">day streak</span>
        </div>

        <Button
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          className="w-full"
        >
          Continue Studying
        </Button>
      </Card>
    </div>
  );
}

export function useStreakCelebration() {
  const [celebratingStreak, setCelebratingStreak] = useState<number | null>(null);
  const [celebratedStreaks, setCelebratedStreaks] = useState<number[]>([]);

  const checkAndCelebrate = (streak: number) => {
    const milestoneDays = [7, 30, 100];
    if (milestoneDays.includes(streak) && !celebratedStreaks.includes(streak)) {
      setCelebratingStreak(streak);
      setCelebratedStreaks((prev) => [...prev, streak]);
    }
  };

  const closeCelebration = () => {
    setCelebratingStreak(null);
  };

  return {
    celebratingStreak,
    checkAndCelebrate,
    closeCelebration,
  };
}