import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, Coffee, Brain, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PomodoroTimerProps {
  onSessionComplete?: () => void;
}

type TimerMode = "focus" | "shortBreak" | "longBreak";

const DEFAULT_TIMES = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const PomodoroTimer = ({ onSessionComplete }: PomodoroTimerProps) => {
  const [times, setTimes] = useState(() => {
    const saved = localStorage.getItem("pomodoroSettings");
    return saved ? JSON.parse(saved) : DEFAULT_TIMES;
  });

  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(times.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessions] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempTimes, setTempTimes] = useState(times);

  const totalTime = times[mode];
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      handleTimerComplete();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = useCallback(() => {
    // Play notification sound
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    } catch {}

    // Show browser notification if permitted
    if (Notification.permission === "granted") {
      new Notification(mode === "focus" ? "Focus session complete!" : "Break is over!", {
        body: mode === "focus" ? "Time for a break!" : "Ready to focus again?",
        icon: "/favicon.ico",
      });
    }

    if (mode === "focus") {
      const newSessions = sessionsCompleted + 1;
      setSessions(newSessions);
      onSessionComplete?.();

      // Every 4 sessions, take a long break
      if (newSessions % 4 === 0) {
        setMode("longBreak");
        setTimeLeft(times.longBreak);
      } else {
        setMode("shortBreak");
        setTimeLeft(times.shortBreak);
      }
    } else {
      setMode("focus");
      setTimeLeft(times.focus);
    }
  }, [mode, sessionsCompleted, times, onSessionComplete]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(times[mode]);
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(times[newMode]);
  };

  const saveSettings = () => {
    setTimes(tempTimes);
    localStorage.setItem("pomodoroSettings", JSON.stringify(tempTimes));
    setTimeLeft(tempTimes[mode]);
    setSettingsOpen(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getModeColor = () => {
    switch (mode) {
      case "focus":
        return "text-primary";
      case "shortBreak":
        return "text-[hsl(var(--badge-success))]";
      case "longBreak":
        return "text-[hsl(var(--badge-practice))]";
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case "focus":
        return "Focus Time";
      case "shortBreak":
        return "Short Break";
      case "longBreak":
        return "Long Break";
    }
  };

  return (
    <>
      <Card className="p-4 bg-card/50 backdrop-blur">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {mode === "focus" ? (
              <Brain className={cn("h-4 w-4", getModeColor())} />
            ) : (
              <Coffee className={cn("h-4 w-4", getModeColor())} />
            )}
            <span className={cn("text-sm font-medium", getModeColor())}>
              {getModeLabel()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              Session {sessionsCompleted + 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setTempTimes(times);
                setSettingsOpen(true);
              }}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="text-center mb-3">
          <span className={cn("text-4xl font-mono font-bold", getModeColor())}>
            {formatTime(timeLeft)}
          </span>
        </div>

        <Progress value={progress} className="h-1.5 mb-3" />

        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetTimer}
            className="h-8"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={toggleTimer}
            className={cn(
              "h-8 px-6",
              isRunning && "bg-destructive hover:bg-destructive/90"
            )}
          >
            {isRunning ? (
              <>
                <Pause className="h-3.5 w-3.5 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1" />
                Start
              </>
            )}
          </Button>
        </div>

        {/* Mode Switcher */}
        <div className="flex justify-center gap-1 mt-3">
          <Button
            variant={mode === "focus" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => switchMode("focus")}
          >
            Focus
          </Button>
          <Button
            variant={mode === "shortBreak" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => switchMode("shortBreak")}
          >
            Short Break
          </Button>
          <Button
            variant={mode === "longBreak" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => switchMode("longBreak")}
          >
            Long Break
          </Button>
        </div>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pomodoro Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Focus Duration (minutes)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={tempTimes.focus / 60}
                onChange={(e) =>
                  setTempTimes((prev) => ({
                    ...prev,
                    focus: parseInt(e.target.value) * 60 || 25 * 60,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Short Break (minutes)</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={tempTimes.shortBreak / 60}
                onChange={(e) =>
                  setTempTimes((prev) => ({
                    ...prev,
                    shortBreak: parseInt(e.target.value) * 60 || 5 * 60,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Long Break (minutes)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={tempTimes.longBreak / 60}
                onChange={(e) =>
                  setTempTimes((prev) => ({
                    ...prev,
                    longBreak: parseInt(e.target.value) * 60 || 15 * 60,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
