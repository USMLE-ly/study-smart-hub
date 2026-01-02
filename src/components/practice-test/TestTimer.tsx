import { useState, useEffect, useCallback } from "react";
import { Clock, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestTimerProps {
  initialSeconds: number;
  isPaused: boolean;
  onTimeUpdate?: (seconds: number) => void;
  onTimeExpired?: () => void;
  countDown?: boolean;
  className?: string;
}

export function TestTimer({
  initialSeconds,
  isPaused,
  onTimeUpdate,
  onTimeExpired,
  countDown = true,
  className,
}: TestTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setSeconds((prev) => {
        const newValue = countDown ? prev - 1 : prev + 1;
        
        if (countDown && newValue <= 0) {
          clearInterval(timer);
          onTimeExpired?.();
          return 0;
        }
        
        onTimeUpdate?.(newValue);
        return newValue;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, countDown, onTimeUpdate, onTimeExpired]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = countDown && seconds < 300; // Less than 5 minutes

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-md",
      isLowTime ? "bg-destructive/20 text-destructive" : "bg-muted/50",
      className
    )}>
      {isPaused ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Clock className={cn("h-4 w-4", isLowTime && "animate-pulse")} />
      )}
      <span className={cn(
        "font-mono font-semibold text-sm",
        isLowTime && "text-destructive"
      )}>
        {formatTime(seconds)}
      </span>
      {isPaused && (
        <span className="text-xs text-muted-foreground">PAUSED</span>
      )}
    </div>
  );
}

// Hook for managing timer state
export function useTestTimer(
  initialSeconds: number,
  mode: "tutor" | "timed"
) {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);
  const toggle = useCallback(() => setIsPaused((p) => !p), []);

  useEffect(() => {
    if (isPaused || (mode === "timed" && timeRemaining <= 0)) return;

    const timer = setInterval(() => {
      setElapsedTime((p) => p + 1);
      
      if (mode === "timed") {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, mode, timeRemaining]);

  return {
    timeRemaining,
    elapsedTime,
    isPaused,
    isExpired,
    pause,
    resume,
    toggle,
    setTimeRemaining,
  };
}
