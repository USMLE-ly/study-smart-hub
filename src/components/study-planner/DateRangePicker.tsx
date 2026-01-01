import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, isAfter, startOfDay } from "date-fns";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onSave: () => void;
  onReset: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onSave,
  onReset,
  isOpen,
  onOpenChange,
}: DateRangePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [leftMonth, setLeftMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);

  const rightMonth = addMonths(leftMonth, 1);

  const handleDateClick = (date: Date) => {
    if (selectingStart) {
      onStartDateChange(date);
      setSelectingStart(false);
    } else {
      if (startDate && isBefore(date, startDate)) {
        onStartDateChange(date);
        onEndDateChange(null);
      } else {
        onEndDateChange(date);
        setSelectingStart(true);
      }
    }
  };

  const handleReset = () => {
    onStartDateChange(null);
    onEndDateChange(null);
    setSelectingStart(true);
    onReset();
  };

  const handleSave = () => {
    setShowCalendar(false);
    onSave();
  };

  const renderMonth = (month: Date) => {
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });
    const startDayOfWeek = startOfMonth(month).getDay();
    const emptyDays = Array(startDayOfWeek).fill(null);

    return (
      <div className="p-3">
        <h4 className="text-center font-semibold mb-3">{format(month, "MMMM yyyy")}</h4>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["S", "M", "T", "W", "Th", "F", "Sa"].map((day, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground font-medium py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}
          {daysInMonth.map((day) => {
            const isStart = startDate && isSameDay(day, startDate);
            const isEnd = endDate && isSameDay(day, endDate);
            const isInRange = startDate && endDate && 
              isAfter(day, startDate) && 
              isBefore(day, endDate);
            const isPast = isBefore(startOfDay(day), startOfDay(new Date()));

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative h-8 flex items-center justify-center",
                  // Background strip for range effect
                  isInRange && "before:absolute before:inset-0 before:bg-primary/20",
                  isStart && endDate && "before:absolute before:inset-y-0 before:right-0 before:left-1/2 before:bg-primary/20",
                  isEnd && startDate && "before:absolute before:inset-y-0 before:left-0 before:right-1/2 before:bg-primary/20"
                )}
              >
                <button
                  onClick={() => !isPast && handleDateClick(day)}
                  disabled={isPast}
                  className={cn(
                    "h-8 w-8 text-sm rounded-full flex items-center justify-center transition-all relative z-10",
                    isPast && "text-muted-foreground/40 cursor-not-allowed",
                    !isPast && "hover:bg-accent cursor-pointer",
                    isStart && "bg-primary text-primary-foreground hover:bg-primary",
                    isEnd && "bg-primary text-primary-foreground hover:bg-primary",
                    isToday(day) && !isStart && !isEnd && "ring-1 ring-primary"
                  )}
                >
                  {format(day, "d")}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
          <span className="font-medium">Choose your start and end dates.</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Based on your selections, we'll evenly distribute tasks across your plan.
            </p>

            {/* Date Input Fields */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                className="gap-2 min-w-[150px] justify-start"
                onClick={() => {
                  setShowCalendar(true);
                  setSelectingStart(true);
                }}
              >
                <CalendarIcon className="h-4 w-4" />
                {startDate ? format(startDate, "MM/dd/yyyy") : "MM/DD/YYYY"}
              </Button>
              <span className="text-muted-foreground">→</span>
              <Button
                variant="outline"
                className="gap-2 min-w-[150px] justify-start"
                onClick={() => {
                  setShowCalendar(true);
                  setSelectingStart(false);
                }}
              >
                <CalendarIcon className="h-4 w-4" />
                {endDate ? format(endDate, "MM/dd/yyyy") : "MM/DD/YYYY"}
              </Button>
            </div>

            {/* Calendar Popup */}
            {showCalendar && (
              <div className="border border-border rounded-lg bg-popover shadow-lg">
                {/* Two Month View */}
                <div className="flex flex-col sm:flex-row">
                  {/* Navigation Left */}
                  <div className="relative flex-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-3 h-8 w-8 z-10"
                      onClick={() => setLeftMonth(subMonths(leftMonth, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {renderMonth(leftMonth)}
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block w-px bg-border" />

                  {/* Navigation Right */}
                  <div className="relative flex-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-3 h-8 w-8 z-10"
                      onClick={() => setLeftMonth(addMonths(leftMonth, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {renderMonth(rightMonth)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 p-3 border-t border-border">
                  <Button variant="ghost" onClick={handleReset}>
                    Reset
                  </Button>
                  <Button onClick={handleSave} disabled={!startDate || !endDate}>
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
