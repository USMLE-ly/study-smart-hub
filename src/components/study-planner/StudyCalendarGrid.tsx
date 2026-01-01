import { useState, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Clock, CheckCircle2, Play } from "lucide-react";
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
  endOfWeek,
  isBefore
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
  onStartFocus?: (task: Task) => void;
}

// Premium task type styling with gradients
const taskTypeStyles: Record<string, { 
  gradient: string; 
  border: string; 
  bg: string; 
  text: string;
  icon: string;
  glow: string;
}> = {
  practice: {
    gradient: "from-rose-500/20 to-pink-500/10",
    border: "border-l-rose-500",
    bg: "bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20",
    text: "text-rose-700 dark:text-rose-400",
    icon: "text-rose-500",
    glow: "hover:shadow-rose-500/10"
  },
  flashcard: {
    gradient: "from-amber-500/20 to-orange-500/10",
    border: "border-l-amber-500",
    bg: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20",
    text: "text-amber-700 dark:text-amber-400",
    icon: "text-amber-500",
    glow: "hover:shadow-amber-500/10"
  },
  review: {
    gradient: "from-emerald-500/20 to-green-500/10",
    border: "border-l-emerald-500",
    bg: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: "text-emerald-500",
    glow: "hover:shadow-emerald-500/10"
  },
  tutorial: {
    gradient: "from-blue-500/20 to-cyan-500/10",
    border: "border-l-blue-500",
    bg: "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20",
    text: "text-blue-700 dark:text-blue-400",
    icon: "text-blue-500",
    glow: "hover:shadow-blue-500/10"
  },
  focus: {
    gradient: "from-violet-500/20 to-purple-500/10",
    border: "border-l-violet-500",
    bg: "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20",
    text: "text-violet-700 dark:text-violet-400",
    icon: "text-violet-500",
    glow: "hover:shadow-violet-500/10"
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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

  const getCompletionPercentage = (date: Date) => {
    const dayTasks = getTasksForDate(date);
    if (dayTasks.length === 0) return 0;
    const completed = dayTasks.filter(t => t.is_completed).length;
    return Math.round((completed / dayTasks.length) * 100);
  };

  const handleDateClick = (date: Date) => {
    if (isSameMonth(date, currentMonth)) {
      setSelectedDate(prev => prev && isSameDay(prev, date) ? null : date);
    }
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
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isDragOver = dragOverDate && isSameDay(day, dragOverDate);
          const totalTime = getTotalHoursForDate(day);
          const completionPct = getCompletionPercentage(day);
          const hasTasks = dayTasks.length > 0;

          return (
            <div
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              className={cn(
                "border-b border-r border-border last:border-r-0 p-1.5 sm:p-2 min-h-[100px] relative group cursor-pointer",
                "transition-all duration-300 ease-out",
                !isCurrentMonth && "bg-muted/20 cursor-default",
                isToday(day) && "bg-gradient-to-br from-primary/5 to-primary/10",
                isHovered && isCurrentMonth && "bg-accent/40 scale-[1.02] z-10 shadow-md",
                isSelected && "bg-primary/10 ring-2 ring-primary/50 ring-inset scale-[1.02] z-20 shadow-lg",
                isDragOver && "bg-primary/20 ring-2 ring-primary/60 ring-inset scale-[1.03] z-20 shadow-xl"
              )}
              style={{ 
                animationDelay: `${dayIndex * 15}ms`,
                transform: isSelected || isHovered && isCurrentMonth ? 'scale(1.02)' : 'scale(1)'
              }}
              onMouseEnter={() => setHoveredDate(day)}
              onMouseLeave={() => setHoveredDate(null)}
              onDragOver={(e) => handleDragOver(e, day)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Completion indicator bar at top */}
              {hasTasks && completionPct > 0 && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ease-out"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              )}

              {/* Day Header */}
              <div className="flex items-start justify-between mb-1.5">
                <div
                  className={cn(
                    "text-xs sm:text-sm font-semibold transition-all duration-300",
                    "flex items-center justify-center",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isCurrentMonth && !isToday(day) && "text-foreground",
                    isToday(day) && "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground w-7 h-7 rounded-full shadow-md shadow-primary/30 animate-scale-in",
                    isSelected && !isToday(day) && "bg-primary/20 w-6 h-6 rounded-full"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="flex items-center gap-1">
                  {totalTime && (
                    <span className="text-[10px] text-muted-foreground/70 font-medium transition-opacity duration-200">
                      {totalTime}
                    </span>
                  )}
                  {hasTasks && (
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all duration-300",
                      completionPct === 100 ? "bg-emerald-500" : 
                      completionPct > 0 ? "bg-amber-500" : "bg-muted-foreground/30"
                    )} />
                  )}
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task, taskIndex) => {
                  const styles = taskTypeStyles[task.task_type] || taskTypeStyles.review;
                  const isDragging = draggedTaskId === task.id;
                  const isOverdue = !task.is_completed && isBefore(new Date(task.scheduled_date), new Date(format(new Date(), "yyyy-MM-dd")));
                  
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
                        "w-full text-left px-2 py-1 text-[10px] sm:text-xs rounded-md border-l-[3px] cursor-grab active:cursor-grabbing",
                        "transition-all duration-300 ease-out",
                        "hover:scale-[1.03] hover:shadow-md hover:-translate-y-0.5",
                        "active:scale-[0.97] active:shadow-none",
                        styles.border,
                        styles.bg,
                        styles.glow,
                        task.is_completed && "opacity-50",
                        isOverdue && !task.is_completed && "ring-1 ring-destructive/50",
                        isDragging && "opacity-60 ring-2 ring-primary shadow-lg scale-105 rotate-1"
                      )}
                      style={{ animationDelay: `${taskIndex * 50}ms` }}
                    >
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-40 shrink-0 transition-opacity duration-200" />
                        {task.is_completed ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        ) : isOverdue ? (
                          <Clock className="h-3 w-3 text-destructive shrink-0 animate-pulse" />
                        ) : null}
                        <span className={cn(
                          "truncate font-medium",
                          styles.text,
                          task.is_completed && "line-through opacity-70"
                        )}>
                          {task.title}
                        </span>
                      </div>
                      {task.estimated_duration_minutes && !task.is_completed && (
                        <div className="flex items-center gap-1 mt-0.5 opacity-60">
                          <Clock className="h-2.5 w-2.5" />
                          <span className="text-[9px]">{task.estimated_duration_minutes}m</span>
                        </div>
                      )}
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
