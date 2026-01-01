import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";

interface CalendarTask {
  id: string;
  date: string;
  type: "practice" | "flashcard" | "tutorial" | "review";
  status: "completed" | "pending" | "overdue";
}

interface StudyCalendarProps {
  tasks: CalendarTask[];
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

const typeColors = {
  practice: "bg-[hsl(330,81%,60%)]",
  flashcard: "bg-[hsl(38,92%,50%)]",
  tutorial: "bg-[hsl(142,71%,45%)]",
  review: "bg-primary",
};

export function StudyCalendar({ tasks, onDateSelect, selectedDate }: StudyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDayOfWeek = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => isSameDay(new Date(task.date), date));
  };

  return (
    <div className="bg-card rounded-lg border border-border/60 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {daysInMonth.map((day) => {
          const dayTasks = getTasksForDate(day);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "aspect-square p-1 rounded-lg transition-all hover:bg-accent/50 flex flex-col items-center",
                isSelected && "bg-primary/10 ring-2 ring-primary",
                isCurrentDay && !isSelected && "bg-accent",
                !isSameMonth(day, currentMonth) && "opacity-40"
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  isCurrentDay && "text-primary font-semibold",
                  isSelected && "text-primary"
                )}
              >
                {format(day, "d")}
              </span>
              {dayTasks.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        typeColors[task.type],
                        task.status === "completed" && "opacity-50"
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(330,81%,60%)]" />
          <span className="text-xs text-muted-foreground">Practice</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(38,92%,50%)]" />
          <span className="text-xs text-muted-foreground">Flashcards</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(142,71%,45%)]" />
          <span className="text-xs text-muted-foreground">Tutorial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Review</span>
        </div>
      </div>
    </div>
  );
}
