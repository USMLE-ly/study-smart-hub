import { useEffect, useState, useRef } from "react";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface ProgressRingProps {
  progress: number;
  daysRemaining: number;
  totalDays: number;
  completed: number;
  overdue: number;
  incomplete: number;
  isPulsing?: boolean;
}

export function ProgressRing({
  progress,
  daysRemaining,
  totalDays,
  completed,
  overdue,
  incomplete,
  isPulsing = false,
}: ProgressRingProps) {
  const size = 200;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  const { playTaskComplete } = useSoundEffects({ volume: 0.3, enabled: true });

  // Animation state with smooth counting
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [showPulse, setShowPulse] = useState(false);
  const animationRef = useRef<number | null>(null);
  const prevProgressRef = useRef(0);
  const prevCompletedRef = useRef(completed);

  // Trigger pulse animation and sound when a task is completed
  useEffect(() => {
    if (completed > prevCompletedRef.current) {
      setShowPulse(true);
      playTaskComplete(); // Play sound effect
      const timer = setTimeout(() => setShowPulse(false), 600);
      prevCompletedRef.current = completed;
      return () => clearTimeout(timer);
    }
    prevCompletedRef.current = completed;
  }, [completed, playTaskComplete]);

  // Also respond to external isPulsing prop
  useEffect(() => {
    if (isPulsing) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isPulsing]);

  // Smooth progress animation with easing
  useEffect(() => {
    const startValue = prevProgressRef.current;
    const endValue = progress;
    const duration = 800; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * eased;
      
      setAnimatedProgress(currentValue);
      setDisplayProgress(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevProgressRef.current = endValue;
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [progress]);

  // Calculate the portions with gap consideration
  const total = completed + overdue + incomplete;
  const gapDegrees = 8; // Gap between segments in degrees
  const segmentCount = [completed, overdue, incomplete].filter(v => v > 0).length;
  const totalGapDegrees = segmentCount > 1 ? gapDegrees * segmentCount : 0;
  const availableDegrees = 360 - totalGapDegrees;

  const completedAngle = total > 0 ? (completed / total) * availableDegrees : 0;
  const overdueAngle = total > 0 ? (overdue / total) * availableDegrees : 0;
  const incompleteAngle = total > 0 ? (incomplete / total) * availableDegrees : 0;

  // Calculate stroke dash for each segment
  const completedDash = (completedAngle / 360) * circumference;
  const overdueDash = (overdueAngle / 360) * circumference;
  const incompleteDash = (incompleteAngle / 360) * circumference;
  const gapDash = (gapDegrees / 360) * circumference;
  const displayTotal = completed + overdue + incomplete;

  // Colors matching UWorld exactly
  const greenColor = "#22C55E"; // Bright green
  const pinkColor = "#F9A8B8"; // Light pink
  const blueColor = "#93C5FD"; // Light blue

  return (
    <div className="relative overflow-hidden bg-card rounded-xl border border-border p-5 h-full flex flex-col min-h-[380px] transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 group">
      {/* Decorative background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Header */}
      <div className="relative mb-2">
        <h3 className="text-lg font-semibold text-foreground">Study Plan Progress</h3>
        <p className="text-base text-foreground mt-1">
          <span className="font-bold">{completed} / {displayTotal || 10}</span>
          <span className="text-muted-foreground ml-1">{daysRemaining} days remaining</span>
        </p>
      </div>

      {/* Progress Ring */}
      <div className="relative flex justify-center flex-1 items-center">
        {/* Glow effect behind ring */}
        <div 
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{ filter: 'blur(40px)' }}
        >
          <div className="w-32 h-32 rounded-full bg-primary/20" />
        </div>
        
        <div 
          className={`relative transition-transform duration-500 group-hover:scale-105 ${showPulse ? 'animate-pulse-ring' : ''}`} 
          style={{ width: size, height: size }}
        >
          {/* Pulse effect ring */}
          {showPulse && (
            <div 
              className="absolute inset-0 rounded-full animate-ping-slow"
              style={{ 
                border: `3px solid ${greenColor}`,
                opacity: 0.4,
              }}
            />
          )}
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
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
                strokeDashoffset={-(completedDash + overdueDash + (completed > 0 ? gapDash : 0) + (overdue > 0 ? gapDash : 0))}
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
                strokeDashoffset={-(completedDash + (completed > 0 ? gapDash : 0))}
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
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            )}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="text-4xl font-bold tabular-nums" 
              style={{ color: greenColor }}
            >
              {displayProgress.toFixed(2)}%
            </span>
            <span className="text-sm text-muted-foreground mt-1">
              Completed
            </span>
          </div>
        </div>
      </div>

      {/* Legend - inline format with enhanced hover */}
      <div className="relative flex items-center justify-center gap-4 mt-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 hover:bg-[hsl(142,71%,45%)]/10 cursor-default group/legend">
          <div className="w-2.5 h-2.5 rounded-full transition-all duration-200 group-hover/legend:scale-125 group-hover/legend:shadow-lg" style={{ backgroundColor: greenColor, boxShadow: '0 0 0 2px transparent' }} />
          <span className="text-xs text-foreground">Completed <span className="font-semibold">{completed}</span></span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 hover:bg-[hsl(350,80%,85%)]/20 cursor-default group/legend">
          <div className="w-2.5 h-2.5 rounded-full transition-all duration-200 group-hover/legend:scale-125" style={{ backgroundColor: pinkColor }} />
          <span className="text-xs text-foreground">Overdue <span className="font-semibold">{overdue}</span></span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 hover:bg-[hsl(210,80%,85%)]/20 cursor-default group/legend">
          <div className="w-2.5 h-2.5 rounded-full transition-all duration-200 group-hover/legend:scale-125" style={{ backgroundColor: blueColor }} />
          <span className="text-xs text-foreground">Incomplete <span className="font-semibold">{incomplete}</span></span>
        </div>
      </div>
      
      {/* Animated bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </div>
  );
}
