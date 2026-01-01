import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, AlertCircle, Calendar } from "lucide-react";

interface ProgressOverviewProps {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalTimeMinutes: number;
  completedTimeMinutes: number;
  daysRemaining: number;
}

export function ProgressOverview({
  totalTasks,
  completedTasks,
  overdueTasks,
  totalTimeMinutes,
  completedTimeMinutes,
  daysRemaining,
}: ProgressOverviewProps) {
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const timeProgress = totalTimeMinutes > 0 ? (completedTimeMinutes / totalTimeMinutes) * 100 : 0;

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins} mins`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return `${hours} hrs`;
    return `${hours} hrs, ${remainingMins} mins`;
  };

  return (
    <div className="bg-card rounded-lg border border-border/60 p-6 space-y-6">
      <h3 className="text-base font-semibold text-foreground">Study Plan Progress</h3>

      {/* Time Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Time Needed to Complete Plan</span>
          </div>
          <span className="text-sm font-medium text-foreground">
            {formatTime(totalTimeMinutes - completedTimeMinutes)} remaining
          </span>
        </div>
        <Progress value={timeProgress} className="h-2.5" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(completedTimeMinutes)} completed</span>
          <span>{formatTime(totalTimeMinutes)} total</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/40">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-[hsl(142,71%,45%)]" />
            <span className="text-2xl font-semibold text-foreground">{completedTasks}</span>
          </div>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-2xl font-semibold text-foreground">{overdueTasks}</span>
          </div>
          <p className="text-xs text-muted-foreground">Overdue</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-2xl font-semibold text-foreground">{daysRemaining}</span>
          </div>
          <p className="text-xs text-muted-foreground">Days Left</p>
        </div>
      </div>

      {/* Task Progress Bar */}
      <div className="space-y-2 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Task Completion</span>
          <span className="font-medium text-foreground">{Math.round(taskProgress)}%</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
          <div
            className="bg-[hsl(142,71%,45%)] transition-all"
            style={{ width: `${taskProgress}%` }}
          />
          {overdueTasks > 0 && (
            <div
              className="bg-destructive"
              style={{ width: `${(overdueTasks / totalTasks) * 100}%` }}
            />
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[hsl(142,71%,45%)]" />
            <span className="text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-muted" />
            <span className="text-muted-foreground">Remaining</span>
          </div>
        </div>
      </div>
    </div>
  );
}
