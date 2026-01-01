import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Study Plan Progress</CardTitle>
        <p className="text-sm text-muted-foreground">
          <span className="text-2xl font-bold text-foreground">
            {totalDays - daysRemaining}
          </span>{" "}
          / {totalDays}{" "}
          <span className="text-muted-foreground">{daysRemaining} days remaining</span>
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative">
          <svg height={radius * 2} width={radius * 2} className="-rotate-90">
            {/* Background circle */}
            <circle
              stroke="hsl(var(--muted))"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              opacity={0.2}
            />
            {/* Incomplete arc */}
            <circle
              stroke="hsl(var(--primary))"
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              opacity={0.3}
            />
            {/* Progress arc */}
            <circle
              stroke="hsl(var(--badge-success))"
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{progress.toFixed(2)}%</span>
            <span className="text-sm text-muted-foreground">Completed</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[hsl(var(--badge-success))]" />
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
      </CardContent>
    </Card>
  );
}
