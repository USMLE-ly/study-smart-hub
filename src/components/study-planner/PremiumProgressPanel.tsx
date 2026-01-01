import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  TrendingUp,
  Zap,
  Target,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGamification } from "@/hooks/useGamification";

interface PremiumProgressPanelProps {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalTimeMinutes: number;
  completedTimeMinutes: number;
  daysRemaining: number;
}

// Animated counter component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

export function PremiumProgressPanel({
  totalTasks,
  completedTasks,
  overdueTasks,
  totalTimeMinutes,
  completedTimeMinutes,
  daysRemaining,
}: PremiumProgressPanelProps) {
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const timeProgress = totalTimeMinutes > 0 ? (completedTimeMinutes / totalTimeMinutes) * 100 : 0;
  const { stats } = useGamification();

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return `${hours}h`;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <div className="bg-gradient-to-br from-card via-card to-muted/20 rounded-xl border border-border/60 p-6 space-y-6 shadow-sm transition-all duration-500 hover:shadow-md hover:border-border">
      {/* Header with streak */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Study Progress
        </h3>
        {stats?.current_streak && stats.current_streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 animate-pulse">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-medium">{stats.current_streak} day streak</span>
          </div>
        )}
      </div>

      {/* Main Progress Ring */}
      <div className="flex items-center gap-6">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="56"
              cy="56"
              r="48"
              fill="none"
              className="stroke-muted"
              strokeWidth="8"
            />
            {/* Progress ring */}
            <circle
              cx="56"
              cy="56"
              r="48"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 48}
              strokeDashoffset={2 * Math.PI * 48 * (1 - taskProgress / 100)}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">
              <AnimatedCounter value={Math.round(taskProgress)} />%
            </span>
            <span className="text-xs text-muted-foreground">Complete</span>
          </div>
        </div>

        {/* Stats column */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Completed
            </span>
            <span className="font-semibold text-foreground">
              <AnimatedCounter value={completedTasks} /> / {totalTasks}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Overdue
            </span>
            <span className={cn(
              "font-semibold",
              overdueTasks > 0 ? "text-destructive" : "text-foreground"
            )}>
              <AnimatedCounter value={overdueTasks} />
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Days Left
            </span>
            <span className="font-semibold text-foreground">
              <AnimatedCounter value={daysRemaining} />
            </span>
          </div>
        </div>
      </div>

      {/* Time Progress */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Study Time Progress
          </span>
          <span className="font-medium text-foreground">
            {formatTime(completedTimeMinutes)} / {formatTime(totalTimeMinutes)}
          </span>
        </div>
        <div className="relative">
          <Progress value={timeProgress} className="h-3" />
          <div 
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
            style={{ left: `calc(${Math.min(timeProgress, 95)}% - 8px)` }}
          >
            <div className="w-4 h-4 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center">
              <Zap className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Task Type Distribution */}
      <div className="space-y-2 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Task Completion
          </span>
        </div>
        <div className="flex h-4 rounded-full overflow-hidden bg-muted/30 shadow-inner">
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out"
            style={{ width: `${taskProgress}%` }}
          />
          {overdueTasks > 0 && totalTasks > 0 && (
            <div
              className="bg-gradient-to-r from-destructive to-red-400"
              style={{ width: `${(overdueTasks / totalTasks) * 100}%` }}
            />
          )}
        </div>
        <div className="flex items-center gap-4 text-xs mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <span className="text-muted-foreground">Completed ({completedTasks})</span>
          </div>
          {overdueTasks > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Overdue ({overdueTasks})</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-muted" />
            <span className="text-muted-foreground">Remaining ({totalTasks - completedTasks - overdueTasks})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
