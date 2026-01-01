import { useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface ProgressRingProps {
  progress: number;
  daysRemaining: number;
  totalDays: number;
  completed: number;
  overdue: number;
  incomplete: number;
}

export function ProgressRing({
  progress,
  daysRemaining,
  totalDays,
  completed,
  overdue,
  incomplete,
}: ProgressRingProps) {
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Animation state
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 150);
    return () => clearTimeout(timer);
  }, [progress]);

  // Calculate the portions
  const total = completed + overdue + incomplete;
  const completedAngle = total > 0 ? (completed / total) * 360 : 0;
  const overdueAngle = total > 0 ? (overdue / total) * 360 : 0;

  // Calculate stroke dash for each segment
  const completedDash = (completedAngle / 360) * circumference;
  const overdueDash = (overdueAngle / 360) * circumference;

  // Gap between segments
  const gap = 4;

  return (
    <div className="bg-card rounded-xl border border-border/50 p-6 shadow-xs h-full flex flex-col">
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Study Plan Progress</h3>
        <p className="text-[13px] text-muted-foreground/80 mt-0.5">{daysRemaining} days remaining</p>
      </div>

      {/* Progress Ring */}
      <div className="flex justify-center py-3 flex-1">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
              opacity={0.5}
            />

            {/* Incomplete segment (shows as muted background) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              opacity={0.15}
              className="transition-all duration-1000 ease-out"
            />

            {/* Overdue segment */}
            {overdue > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(var(--destructive))"
                strokeWidth={strokeWidth}
                strokeDasharray={`${overdueDash - gap} ${circumference - overdueDash + gap}`}
                strokeDashoffset={-completedDash}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            )}

            {/* Completed segment */}
            {completed > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(var(--badge-success))"
                strokeWidth={strokeWidth}
                strokeDasharray={`${completedDash - gap} ${circumference - completedDash + gap}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            )}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[32px] font-bold text-foreground tracking-tight leading-none">
              {animatedProgress.toFixed(0)}%
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1">
              Complete
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/30">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--badge-success))]" strokeWidth={2} />
            <span className="text-base font-semibold text-foreground">{completed}</span>
          </div>
          <span className="text-[11px] text-muted-foreground/70 font-medium">Completed</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-destructive" strokeWidth={2} />
            <span className="text-base font-semibold text-foreground">{overdue}</span>
          </div>
          <span className="text-[11px] text-muted-foreground/70 font-medium">Overdue</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary/60" strokeWidth={2} />
            <span className="text-base font-semibold text-foreground">{incomplete}</span>
          </div>
          <span className="text-[11px] text-muted-foreground/70 font-medium">Remaining</span>
        </div>
      </div>
    </div>
  );
}
