import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Target, Trophy, Flame, Clock, Edit2, CheckCircle2 } from "lucide-react";
import { useStudyTasks } from "@/hooks/useStudyTasks";
import { useGamification } from "@/hooks/useGamification";
import { 
  areNotificationsEnabled, 
  sendNotification,
  getNotificationPreferences 
} from "@/utils/notifications";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DailyGoal {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  icon: typeof Target;
  color: string;
}

export const DailyGoalsWidget = () => {
  const { tasks, stats } = useStudyTasks();
  const { stats: gamificationStats } = useGamification();
  const [editOpen, setEditOpen] = useState(false);
  
  // Get today's date
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Calculate today's progress
  const todaysTasks = tasks.filter(t => t.scheduled_date === today);
  const completedToday = todaysTasks.filter(t => t.is_completed).length;
  const studyMinutesToday = todaysTasks
    .filter(t => t.is_completed)
    .reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0);

  // Load goals from localStorage or use defaults (hardened against corrupted JSON / blocked storage)
  const defaultGoals: DailyGoal[] = [
    {
      id: "tasks",
      label: "Tasks Completed",
      current: 0,
      target: 5,
      unit: "tasks",
      icon: CheckCircle2,
      color: "hsl(var(--badge-success))",
    },
    {
      id: "study",
      label: "Study Time",
      current: 0,
      target: 120,
      unit: "min",
      icon: Clock,
      color: "hsl(var(--primary))",
    },
    {
      id: "questions",
      label: "Questions Practiced",
      current: 0,
      target: 20,
      unit: "questions",
      icon: Target,
      color: "hsl(var(--badge-practice))",
    },
  ];

  const [goals, setGoals] = useState<DailyGoal[]>(() => {
    try {
      const saved = localStorage.getItem("dailyStudyGoals");
      if (!saved) return defaultGoals;

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return defaultGoals;

      // Only trust saved targets; keep icons/labels stable from defaults
      const targetById = new Map<string, number>();
      for (const g of parsed) {
        if (g && typeof g.id === "string") {
          const t = Number((g as any).target);
          if (Number.isFinite(t) && t > 0) targetById.set(g.id, t);
        }
      }

      return defaultGoals.map((g) => ({
        ...g,
        target: targetById.get(g.id) ?? g.target,
      }));
    } catch (e) {
      // If storage is blocked or JSON is corrupted, fall back safely.
      try {
        localStorage.removeItem("dailyStudyGoals");
      } catch {
        // ignore
      }
      return defaultGoals;
    }
  });

  // Update goals with real data
  useEffect(() => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === "tasks") {
        return { ...goal, current: completedToday };
      }
      if (goal.id === "study") {
        return { ...goal, current: studyMinutesToday };
      }
      return goal;
    }));
  }, [completedToday, studyMinutesToday]);

  // Check for evening reminder
  useEffect(() => {
    const prefs = getNotificationPreferences();
    if (!prefs.dailyReminders || !areNotificationsEnabled()) return;

    const checkGoals = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Check at the reminder hour (default 18:00 / 6 PM)
      if (currentHour === prefs.reminderHour) {
        const allMet = goals.every(g => g.current >= g.target);
        if (!allMet) {
          sendNotification("Daily Study Goals Reminder 📚", {
            body: `You have unmet study goals today. Keep going to maintain your streak!`,
            tag: "daily-goal-reminder",
          });
        }
      }
    };

    // Check every 30 minutes
    const interval = setInterval(checkGoals, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [goals]);

  // Save goals to localStorage
  const saveGoals = useCallback((newGoals: DailyGoal[]) => {
    localStorage.setItem("dailyStudyGoals", JSON.stringify(newGoals));
    setGoals(newGoals);
  }, []);

  const handleUpdateGoal = (id: string, newTarget: number) => {
    const updated = goals.map(g => 
      g.id === id ? { ...g, target: newTarget } : g
    );
    saveGoals(updated);
  };

  const overallProgress = goals.reduce((sum, g) => {
    const progress = Math.min(100, (g.current / g.target) * 100);
    return sum + progress;
  }, 0) / goals.length;

  const allGoalsMet = goals.every(g => g.current >= g.target);

  return (
    <>
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Daily Goals
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOpen(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Daily Progress</span>
              <span className={cn(
                "font-medium",
                allGoalsMet ? "text-[hsl(var(--badge-success))]" : "text-foreground"
              )}>
                {Math.round(overallProgress)}%
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Individual Goals */}
          <div className="space-y-3">
            {goals.map((goal) => {
              const Icon = goal.icon;
              const progress = Math.min(100, (goal.current / goal.target) * 100);
              const isComplete = goal.current >= goal.target;

              return (
                <div key={goal.id} className="flex items-center gap-3">
                  <div 
                    className={cn(
                      "p-2 rounded-lg",
                      isComplete ? "bg-[hsl(var(--badge-success))]/10" : "bg-muted"
                    )}
                  >
                    <Icon 
                      className={cn(
                        "h-4 w-4",
                        isComplete ? "text-[hsl(var(--badge-success))]" : "text-muted-foreground"
                      )} 
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn(
                        "font-medium",
                        isComplete && "text-[hsl(var(--badge-success))]"
                      )}>
                        {goal.label}
                      </span>
                      <span className="text-muted-foreground">
                        {goal.current}/{goal.target} {goal.unit}
                      </span>
                    </div>
                    <Progress 
                      value={progress} 
                      className={cn(
                        "h-1.5",
                        isComplete && "[&>div]:bg-[hsl(var(--badge-success))]"
                      )} 
                    />
                  </div>
                  {isComplete && (
                    <Trophy className="h-4 w-4 text-[hsl(var(--badge-success))]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Streak Reminder */}
          {gamificationStats && gamificationStats.current_streak > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 text-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-foreground">
                Keep it up! {gamificationStats.current_streak} day streak 🔥
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Goals Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Daily Goals</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {goals.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <Label>{goal.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={goal.target}
                    onChange={(e) => handleUpdateGoal(goal.id, parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">{goal.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Save Goals</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
