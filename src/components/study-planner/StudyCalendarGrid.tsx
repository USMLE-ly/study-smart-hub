import { useState, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical } from "lucide-react";
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
  onTaskClick?: (task: Task) => void;
  onMoveTask?: (taskId: string, newDate: string) => void;
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

// Shorter day labels for mobile/narrow views
const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function StudyCalendarGrid({
  currentMonth,
  tasks,
  onAddTask,
  onToggleComplete,
  onDeleteTask,
  onTaskClick,
  onMoveTask
}: StudyCalendarGridProps) {
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

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
    return `${hours}h`;
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, date: Date) => {
    e.preventDefault();
    if (isSameMonth(date, currentMonth)) {
      setDragOverDate(date);
    }
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, date: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId && onMoveTask && isSameMonth(date, currentMonth)) {
      onMoveTask(taskId, format(date, "yyyy-MM-dd"));
    }
    setDraggedTaskId(null);
    setDragOverDate(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverDate(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Weekday Headers - fixed width with truncation */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className="py-2 px-1 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide border-r border-border last:border-r-0 text-center truncate animate-fade-in"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((day, dayIndex) => {
          const dayTasks = getTasksForDate(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isHovered = hoveredDate && isSameDay(day, hoveredDate);
          const isDragOver = dragOverDate && isSameDay(day, dragOverDate);
          const totalTime = getTotalHoursForDate(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-b border-r border-border last:border-r-0 p-1 sm:p-2 min-h-[100px] relative group transition-all duration-200",
                !isCurrentMonth && "bg-muted/20",
                isToday(day) && "bg-primary/5",
                isHovered && "bg-accent/30",
                isDragOver && "bg-primary/20 ring-2 ring-primary/40 ring-inset scale-[1.02] z-10"
              )}
              onMouseEnter={() => setHoveredDate(day)}
              onMouseLeave={() => setHoveredDate(null)}
              onDragOver={(e) => handleDragOver(e, day)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Day Header */}
              <div className="flex items-start justify-between mb-1">
                <span
                  className={cn(
                    "text-xs sm:text-sm font-medium transition-all duration-200",
                    !isCurrentMonth && "text-muted-foreground/50",
                    isToday(day) && "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs animate-scale-in"
                  )}
                >
                  {format(day, "d")}
                </span>
                {totalTime && (
                  <span className="text-[10px] text-muted-foreground transition-opacity duration-200">{totalTime}</span>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task, taskIndex) => {
                  const colors = taskTypeColors[task.task_type] || taskTypeColors.review;
                  const isDragging = draggedTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick?.(task);
                      }}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 text-[10px] sm:text-xs rounded border-l-2 truncate cursor-grab active:cursor-grabbing flex items-center gap-1",
                        "transition-all duration-200 hover:scale-[1.02] hover:shadow-sm active:scale-95",
                        colors.border,
                        colors.bg,
                        colors.text,
                        task.is_completed && "opacity-50 line-through",
                        isDragging && "opacity-50 ring-2 ring-primary scale-105 rotate-1"
                      )}
                      style={{ animationDelay: `${taskIndex * 50}ms` }}
                    >
                      <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0 transition-opacity duration-200" />
                      <span className="truncate">{task.title}</span>
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1.5 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>

              {/* Add Task Button (on hover) */}
              {isCurrentMonth && (
                <button
                  onClick={() => onAddTask(day)}
                  className={cn(
                    "absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-primary flex items-center gap-0.5",
                    "opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0",
                    "hover:scale-110 active:scale-95"
                  )}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
