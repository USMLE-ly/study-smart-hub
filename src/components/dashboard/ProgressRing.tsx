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
  const size = 200;
  const strokeWidth = 18;
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

  const gap = 4;
  const displayTotal = completed + overdue + incomplete;

  // Colors matching UWorld exactly
  const greenColor = "#22C55E"; // Bright green
  const pinkColor = "#F9A8B8"; // Light pink
  const blueColor = "#93C5FD"; // Light blue

  return (
    <div className="bg-card rounded-lg border border-border p-5 h-full flex flex-col min-h-[380px] transition-all duration-300 hover:shadow-md group">
      {/* Header */}
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-foreground">Study Plan Progress</h3>
        <p className="text-base text-foreground mt-1">
          <span className="font-bold">{completed} / {displayTotal || 10}</span>
          <span className="text-muted-foreground ml-1">{daysRemaining} days remaining</span>
        </p>
      </div>

      {/* Progress Ring */}
      <div className="flex justify-center flex-1 items-center">
        <div className="relative transition-transform duration-500 group-hover:scale-105" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
              className="transition-all duration-500"
            />

            {/* Incomplete segment (light blue) - draw first (bottom layer) */}
            {incomplete > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={blueColor}
                strokeWidth={strokeWidth}
                strokeDasharray={`${incompleteDash} ${circumference - incompleteDash}`}
                strokeDashoffset={-(completedDash + overdueDash + gap)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{ transitionDelay: '200ms' }}
              />
            )}

            {/* Overdue segment (pink) */}
            {overdue > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={pinkColor}
                strokeWidth={strokeWidth}
                strokeDasharray={`${overdueDash} ${circumference - overdueDash}`}
                strokeDashoffset={-(completedDash + gap)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{ transitionDelay: '100ms' }}
              />
            )}

            {/* Completed segment (green) - draw last (top layer) */}
            {completed > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={greenColor}
                strokeWidth={strokeWidth}
                strokeDasharray={`${completedDash} ${circumference - completedDash}`}
                strokeDashoffset={gap / 2}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            )}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="text-4xl font-bold transition-all duration-700 ease-out" 
              style={{ color: greenColor }}
            >
              {animatedProgress.toFixed(2)}%
            </span>
            <span className="text-sm text-muted-foreground mt-1">
              Completed
            </span>
          </div>
        </div>
      </div>

      {/* Legend - inline format like UWorld */}
      <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
        <div className="flex items-center gap-1.5 transition-transform duration-200 hover:scale-105 cursor-default">
          <div className="w-2.5 h-2.5 rounded-full transition-transform duration-200 hover:scale-125" style={{ backgroundColor: greenColor }} />
          <span className="text-xs text-foreground">Completed <span className="font-medium">{completed}</span></span>
        </div>
        <div className="flex items-center gap-1.5 transition-transform duration-200 hover:scale-105 cursor-default">
          <div className="w-2.5 h-2.5 rounded-full transition-transform duration-200 hover:scale-125" style={{ backgroundColor: pinkColor }} />
          <span className="text-xs text-foreground">Overdue <span className="font-medium">{overdue}</span></span>
        </div>
        <div className="flex items-center gap-1.5 transition-transform duration-200 hover:scale-105 cursor-default">
          <div className="w-2.5 h-2.5 rounded-full transition-transform duration-200 hover:scale-125" style={{ backgroundColor: blueColor }} />
          <span className="text-xs text-foreground">Incomplete <span className="font-medium">{incomplete}</span></span>
        </div>
      </div>
    </div>
  );
}
