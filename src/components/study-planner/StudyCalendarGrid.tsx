import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  isSameDay,
  startOfWeek,
  endOfWeek
} from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  scheduled_date: string;
  estimated_duration_minutes: number | null;
  is_completed: boolean | null;
  completed_at: string | null;
}

interface StudyCalendarGridProps {
  currentMonth: Date;
  tasks: Task[];
  onAddTask: (date: Date) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
}

const taskTypeColors: Record<string, { border: string; bg: string; text: string }> = {
  practice: {
    border: "border-l-[hsl(330,81%,60%)]",
    bg: "bg-[hsl(330,81%,95%)]",
    text: "text-[hsl(330,81%,40%)]"
  },
  flashcard: {
    border: "border-l-[hsl(38,92%,50%)]",
    bg: "bg-[hsl(38,92%,95%)]",
    text: "text-[hsl(38,92%,35%)]"
  },
  review: {
    border: "border-l-[hsl(142,71%,45%)]",
    bg: "bg-[hsl(142,71%,95%)]",
    text: "text-[hsl(142,71%,35%)]"
  },
  focus: {
    border: "border-l-primary",
    bg: "bg-primary/10",
    text: "text-primary"
  }
};

const weekDays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export function StudyCalendarGrid({
  currentMonth,
  tasks,
  onAddTask,
  onToggleComplete,
  onDeleteTask
}: StudyCalendarGridProps) {
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => isSameDay(new Date(task.scheduled_date), date));
  };

  const getTotalHoursForDate = (date: Date) => {
    const dayTasks = getTasksForDate(date);
    const totalMinutes = dayTasks.reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0 && mins === 0) return "";
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide border-r border-border last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((day, idx) => {
          const dayTasks = getTasksForDate(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isHovered = hoveredDate && isSameDay(day, hoveredDate);
          const totalTime = getTotalHoursForDate(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-b border-r border-border last:border-r-0 p-2 min-h-[120px] relative group transition-colors",
                !isCurrentMonth && "bg-muted/20",
                isToday(day) && "bg-primary/5",
                isHovered && "bg-accent/30"
              )}
              onMouseEnter={() => setHoveredDate(day)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              {/* Day Header */}
              <div className="flex items-start justify-between mb-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    !isCurrentMonth && "text-muted-foreground/50",
                    isToday(day) && "bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center"
                  )}
                >
                  {format(day, "d")}
                </span>
                {totalTime && (
                  <span className="text-xs text-muted-foreground">{totalTime}</span>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => {
                  const colors = taskTypeColors[task.task_type] || taskTypeColors.review;
                  return (
                    <button
                      key={task.id}
                      onClick={() => onToggleComplete(task.id, !task.is_completed)}
                      className={cn(
                        "w-full text-left px-2 py-1 text-xs rounded border-l-2 truncate transition-all",
                        colors.border,
                        colors.bg,
                        colors.text,
                        task.is_completed && "opacity-50 line-through"
                      )}
                    >
                      {task.title}
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-muted-foreground px-2">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>

              {/* Add Task Button (on hover) */}
              {isCurrentMonth && (
                <button
                  onClick={() => onAddTask(day)}
                  className={cn(
                    "absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                    "hover:underline"
                  )}
                >
                  <Plus className="h-3 w-3" />
                  Add Task
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
