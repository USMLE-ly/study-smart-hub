import { useEffect, useState } from "react";

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
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Animation state
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Calculate the portions
  const total = completed + overdue + incomplete;
  const completedAngle = total > 0 ? (completed / total) * 360 : 0;
  const overdueAngle = total > 0 ? (overdue / total) * 360 : 0;
  const incompleteAngle = total > 0 ? (incomplete / total) * 360 : 0;

  // Calculate stroke dash for each segment
  const completedDash = (completedAngle / 360) * circumference;
  const overdueDash = (overdueAngle / 360) * circumference;
  const incompleteDash = (incompleteAngle / 360) * circumference;

  // Gap between segments
  const gap = 3;

  return (
    <div className="bg-card rounded-lg border border-border/60 p-6 shadow-sm h-full">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">Study Plan Progress</h3>
        <p className="text-sm text-muted-foreground mt-1">{daysRemaining} days remaining</p>
      </div>

      {/* Progress Ring */}
      <div className="flex justify-center py-4">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={strokeWidth}
              opacity={0.4}
            />

            {/* Incomplete segment */}
            {incomplete > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={strokeWidth}
                strokeDasharray={`${incompleteDash - gap} ${circumference - incompleteDash + gap}`}
                strokeDashoffset={-(completedDash + overdueDash)}
                strokeLinecap="round"
                opacity={0.25}
                className="transition-all duration-700 ease-out"
              />
            )}

            {/* Overdue segment */}
            {overdue > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(0, 72%, 51%)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${overdueDash - gap} ${circumference - overdueDash + gap}`}
                strokeDashoffset={-completedDash}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            )}

            {/* Completed segment */}
            {completed > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(142, 71%, 45%)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${completedDash - gap} ${circumference - completedDash + gap}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            )}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground tracking-tight">
              {animatedProgress.toFixed(0)}%
            </span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Complete
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-border/40">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "hsl(142, 71%, 45%)" }}
            />
            <span className="text-lg font-semibold text-foreground">{completed}</span>
          </div>
          <span className="text-xs text-muted-foreground">Completed</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div 
              className="h-2.5 w-2.5 rounded-full" 
              style={{ backgroundColor: "hsl(0, 72%, 51%)" }}
            />
            <span className="text-lg font-semibold text-foreground">{overdue}</span>
          </div>
          <span className="text-xs text-muted-foreground">Overdue</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="h-2.5 w-2.5 rounded-full bg-primary/30" />
            <span className="text-lg font-semibold text-foreground">{incomplete}</span>
          </div>
          <span className="text-xs text-muted-foreground">Incomplete</span>
        </div>
      </div>
    </div>
  );
}
