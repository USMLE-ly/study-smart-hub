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
  const size = 180;
  const strokeWidth = 14;
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
  const incompleteAngle = total > 0 ? (incomplete / total) * 360 : 0;

  // Calculate stroke dash for each segment
  const completedDash = (completedAngle / 360) * circumference;
  const overdueDash = (overdueAngle / 360) * circumference;
  const incompleteDash = (incompleteAngle / 360) * circumference;

  const gap = total > 1 ? 6 : 0;

  const displayTotal = completed + overdue + incomplete;

  return (
    <div className="bg-card rounded-lg border border-border p-5 h-full flex flex-col min-h-[380px]">
      {/* Header */}
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-foreground">Study Plan Progress</h3>
        <p className="text-base text-foreground mt-1">
          <span className="font-semibold">{completed} / {displayTotal || 10}</span>
          <span className="text-muted-foreground ml-1">{daysRemaining} days remaining</span>
        </p>
      </div>

      {/* Progress Ring */}
      <div className="flex justify-center flex-1 items-center">
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
              opacity={0.3}
            />

            {/* Incomplete segment (light blue/primary) */}
            {incomplete > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={strokeWidth}
                strokeDasharray={`${incompleteDash - (total > 1 ? gap : 0)} ${circumference - incompleteDash + (total > 1 ? gap : 0)}`}
                strokeDashoffset={-(completedDash + overdueDash)}
                strokeLinecap="round"
                opacity={0.4}
                className="transition-all duration-1000 ease-out"
              />
            )}

            {/* Overdue segment (pink/red) */}
            {overdue > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(350, 80%, 70%)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${overdueDash - (total > 1 ? gap : 0)} ${circumference - overdueDash + (total > 1 ? gap : 0)}`}
                strokeDashoffset={-completedDash}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            )}

            {/* Completed segment (green) */}
            {completed > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(142, 71%, 45%)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${completedDash - (total > 1 ? gap : 0)} ${circumference - completedDash + (total > 1 ? gap : 0)}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            )}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-[hsl(142,71%,45%)]">
              {animatedProgress.toFixed(2)}%
            </span>
            <span className="text-sm text-muted-foreground mt-1">
              Completed
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[hsl(142,71%,45%)]" />
          <span className="text-sm text-foreground">Completed {completed}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[hsl(350,80%,70%)]" />
          <span className="text-sm text-foreground">Overdue {overdue}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary/40" />
          <span className="text-sm text-foreground">Incomplete {incomplete}</span>
        </div>
      </div>
    </div>
  );
}
