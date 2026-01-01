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
  const gap = 4;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      {/* Header */}
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-foreground">Study Plan Progress</h3>
      </div>
      
      {/* Days Counter */}
      <div className="flex items-baseline gap-1.5 mb-6">
        <span className="text-3xl font-bold text-foreground">{completed}</span>
        <span className="text-xl text-muted-foreground font-medium">/ {totalDays}</span>
        <span className="text-sm text-muted-foreground ml-2">{daysRemaining} days remaining</span>
      </div>

      {/* Progress Ring */}
      <div className="flex justify-center py-2">
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
              opacity={0.15}
            />

            {/* Incomplete segment (light blue/purple) - always starts first */}
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
                opacity={0.35}
              />
            )}

            {/* Overdue segment (coral/red) */}
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
                opacity={0.7}
              />
            )}

            {/* Completed segment (green) - drawn last to be on top */}
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
              />
            )}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-foreground tracking-tight">
              {progress.toFixed(2)}%
            </span>
            <span className="text-sm text-muted-foreground font-medium">Completed</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-6 text-sm">
        <div className="flex items-center gap-1.5">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: "hsl(142, 71%, 45%)" }}
          />
          <span className="text-muted-foreground">Completed</span>
          <span className="font-semibold text-foreground">{completed}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-destructive opacity-70" />
          <span className="text-muted-foreground">Overdue</span>
          <span className="font-semibold text-foreground">{overdue}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-primary opacity-35" />
          <span className="text-muted-foreground">Incomplete</span>
          <span className="font-semibold text-foreground">{incomplete}</span>
        </div>
      </div>
    </div>
  );
}