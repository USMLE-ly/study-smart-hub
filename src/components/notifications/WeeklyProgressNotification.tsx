import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Trophy, 
  Target,
  TrendingUp,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { Link } from "react-router-dom";

interface WeeklySummary {
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  minutesStudied: number;
  testsCompleted: number;
  avgTestScore: number;
  currentStreak: number;
  achievementsEarned: number;
  weekLabel: string;
}

interface WeeklyProgressNotificationProps {
  open: boolean;
  onClose: () => void;
  summary: WeeklySummary | null;
}

export function WeeklyProgressNotification({ 
  open, 
  onClose, 
  summary 
}: WeeklyProgressNotificationProps) {
  const { playAchievement } = useSoundEffects({ volume: 0.3, enabled: true });

  // Play achievement sound when notification opens
  useEffect(() => {
    if (open && summary) {
      playAchievement();
    }
  }, [open, summary, playAchievement]);

  if (!summary) return null;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getCompletionEmoji = (rate: number) => {
    if (rate >= 90) return "🏆";
    if (rate >= 70) return "🌟";
    if (rate >= 50) return "💪";
    return "📚";
  };

  const getMotivationalMessage = (rate: number) => {
    if (rate >= 90) return "Outstanding week! You're crushing it!";
    if (rate >= 70) return "Great progress! Keep up the momentum!";
    if (rate >= 50) return "Good effort! Every step counts!";
    return "Every day is a fresh start. You've got this!";
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
        
        <DialogHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Weekly Progress</DialogTitle>
                <DialogDescription className="text-sm">{summary.weekLabel}</DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 relative">
          {/* Motivational Header */}
          <div className="text-center py-2">
            <span className="text-4xl">{getCompletionEmoji(summary.completionRate)}</span>
            <p className="text-sm text-muted-foreground mt-2">
              {getMotivationalMessage(summary.completionRate)}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Tasks Completed */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Tasks</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {summary.tasksCompleted}/{summary.totalTasks}
              </p>
            </div>

            {/* Study Time */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Study Time</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatTime(summary.minutesStudied)}
              </p>
            </div>

            {/* Streak */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Streak</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {summary.currentStreak} days
              </p>
            </div>

            {/* Achievements */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Achievements</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {summary.achievementsEarned}
              </p>
            </div>
          </div>

          {/* Completion Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="h-4 w-4" />
                Weekly Completion
              </span>
              <span className="font-semibold text-foreground">{summary.completionRate}%</span>
            </div>
            <Progress value={summary.completionRate} className="h-2" />
          </div>

          {/* Tests Summary */}
          {summary.testsCompleted > 0 && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm">Tests Completed</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{summary.testsCompleted}</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    Avg: {summary.avgTestScore}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Dismiss
            </Button>
            <Button
              className="flex-1 gap-2"
              asChild
            >
              <Link to="/weekly-report" onClick={onClose}>
                <Sparkles className="h-4 w-4" />
                View Full Report
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
