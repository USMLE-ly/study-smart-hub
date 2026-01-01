import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayConfig {
  day: string;
  shortName: string;
  enabled: boolean;
  hours: number;
}

interface StudyDaysSelectorProps {
  totalTimeNeeded?: number; // in hours
  initialSchedule?: DayConfig[];
  onScheduleChange?: (schedule: DayConfig[]) => void;
}

const DAYS: { day: string; shortName: string }[] = [
  { day: "Sunday", shortName: "Sun" },
  { day: "Monday", shortName: "Mon" },
  { day: "Tuesday", shortName: "Tue" },
  { day: "Wednesday", shortName: "Wed" },
  { day: "Thursday", shortName: "Thu" },
  { day: "Friday", shortName: "Fri" },
  { day: "Saturday", shortName: "Sat" },
];

export function StudyDaysSelector({ 
  totalTimeNeeded = 100, 
  initialSchedule,
  onScheduleChange 
}: StudyDaysSelectorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [schedule, setSchedule] = useState<DayConfig[]>(
    initialSchedule || DAYS.map(d => ({ ...d, enabled: false, hours: 0 }))
  );

  // Sync with initial schedule when it changes
  useEffect(() => {
    if (initialSchedule && initialSchedule.length > 0) {
      setSchedule(initialSchedule);
    }
  }, [initialSchedule]);

  const totalScheduledHours = schedule.reduce((sum, day) => sum + (day.enabled ? day.hours : 0), 0);
  const progressPercentage = Math.min(100, (totalScheduledHours / totalTimeNeeded) * 100);
  
  // Determine progress bar color: red when low, transitions to green when sufficient
  const getProgressColor = () => {
    if (progressPercentage >= 80) return "bg-green-500";
    if (progressPercentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleDayToggle = (index: number, checked: boolean) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { 
      ...newSchedule[index], 
      enabled: checked,
      hours: checked ? (newSchedule[index].hours || 0) : 0
    };
    setSchedule(newSchedule);
    onScheduleChange?.(newSchedule);
  };

  const handleHoursChange = (index: number, hours: number[]) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], hours: hours[0] };
    setSchedule(newSchedule);
    onScheduleChange?.(newSchedule);
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Progress Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Time Needed to Complete Plan</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {totalScheduledHours}h / {totalTimeNeeded}h
          </span>
        </div>
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              getProgressColor()
            )}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
          <span className="font-medium">Select your study days and how many hours to dedicate to your plan.</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-3">
            {schedule.map((dayConfig, index) => (
              <div 
                key={dayConfig.day}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg transition-all",
                  dayConfig.enabled ? "bg-muted/50" : "bg-transparent"
                )}
              >
                {/* Day Checkbox */}
                <div className="flex items-center gap-3 min-w-[80px]">
                  <Checkbox
                    id={`day-${dayConfig.shortName}`}
                    checked={dayConfig.enabled}
                    onCheckedChange={(checked) => handleDayToggle(index, !!checked)}
                  />
                  <label 
                    htmlFor={`day-${dayConfig.shortName}`}
                    className={cn(
                      "text-sm font-medium cursor-pointer",
                      dayConfig.enabled ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {dayConfig.shortName}
                  </label>
                </div>

                {/* Hours Slider */}
                <div className="flex-1 flex items-center gap-4">
                  <Slider
                    value={[dayConfig.hours]}
                    min={0}
                    max={12}
                    step={1}
                    disabled={!dayConfig.enabled}
                    onValueChange={(value) => handleHoursChange(index, value)}
                    className={cn(
                      "flex-1",
                      !dayConfig.enabled && "opacity-30"
                    )}
                  />
                  
                  {/* Hours Display */}
                  <div 
                    className={cn(
                      "min-w-[60px] text-center px-3 py-1 rounded border text-sm font-medium transition-colors",
                      dayConfig.enabled && dayConfig.hours > 0 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {dayConfig.hours} hrs
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
