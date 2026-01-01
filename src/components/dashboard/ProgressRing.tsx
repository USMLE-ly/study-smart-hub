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
  const size = 200;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Calculate the portions
  const total = completed + overdue + incomplete;
  const completedPortion = total > 0 ? (completed / total) * 100 : 0;
  const overduePortion = total > 0 ? (overdue / total) * 100 : 0;
  const incompletePortion = total > 0 ? (incomplete / total) * 100 : 0;

  // Calculate stroke dash offsets for each segment
  const completedOffset = circumference - (completedPortion / 100) * circumference;
  const overdueOffset = circumference - (overduePortion / 100) * circumference;
  const incompleteOffset = circumference - (incompletePortion / 100) * circumference;

  // Rotation for each segment
  const completedRotation = -90; // Start from top
  const overdueRotation = completedRotation + (completedPortion * 3.6);
  const incompleteRotation = overdueRotation + (overduePortion * 3.6);

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Study Plan Progress</h3>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-bold text-foreground">{totalDays - daysRemaining}</span>
          <span className="text-lg text-muted-foreground">/ {totalDays}</span>
          <span className="text-sm text-muted-foreground ml-1">{daysRemaining} days remaining</span>
        </div>
      </div>

      {/* Progress Ring */}
      <div className="flex justify-center py-4">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
              opacity={0.2}
            />
            
            {/* Incomplete segment (blue/purple) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={incompleteOffset}
              strokeLinecap="round"
              style={{ transform: `rotate(${incompleteRotation}deg)`, transformOrigin: 'center' }}
              opacity={0.3}
            />

            {/* Overdue segment (red/coral) */}
            {overdue > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(var(--destructive))"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={overdueOffset}
                strokeLinecap="round"
                style={{ transform: `rotate(${overdueRotation}deg)`, transformOrigin: 'center' }}
                opacity={0.6}
              />
            )}

            {/* Completed segment (green) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(142, 71%, 45%)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={completedOffset}
              strokeLinecap="round"
              style={{ transform: `rotate(${completedRotation}deg)`, transformOrigin: 'center' }}
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{progress.toFixed(2)}%</span>
            <span className="text-sm text-muted-foreground">Completed</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
          <span className="text-muted-foreground">Completed</span>
          <span className="font-semibold text-foreground">{completed}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Overdue</span>
          <span className="font-semibold text-foreground">{overdue}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary/30" />
          <span className="text-muted-foreground">Incomplete</span>
          <span className="font-semibold text-foreground">{incomplete}</span>
        </div>
      </div>
    </div>
  );
}