import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle2, Circle, Clock, MoreVertical, Trash2, Edit, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

interface TaskListProps {
  tasks: Task[];
  selectedDate: Date;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  showAllTasks?: boolean;
}

// Premium task type styling
const typeStyles: Record<string, { bg: string; text: string; label: string; gradient: string; border: string }> = {
  practice: {
    bg: "bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20",
    text: "text-rose-700 dark:text-rose-400",
    label: "Practice Questions",
    gradient: "from-rose-500 to-pink-500",
    border: "border-rose-500/30 hover:border-rose-500/50",
  },
  flashcard: {
    bg: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20",
    text: "text-amber-700 dark:text-amber-400",
    label: "Flashcards",
    gradient: "from-amber-500 to-orange-500",
    border: "border-amber-500/30 hover:border-amber-500/50",
  },
  tutorial: {
    bg: "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20",
    text: "text-blue-700 dark:text-blue-400",
    label: "Tutorial",
    gradient: "from-blue-500 to-cyan-500",
    border: "border-blue-500/30 hover:border-blue-500/50",
  },
  review: {
    bg: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "Review",
    gradient: "from-emerald-500 to-green-500",
    border: "border-emerald-500/30 hover:border-emerald-500/50",
  },
  focus: {
    bg: "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20",
    text: "text-violet-700 dark:text-violet-400",
    label: "Focus Time",
    gradient: "from-violet-500 to-purple-500",
    border: "border-violet-500/30 hover:border-violet-500/50",
  },
};

const formatDuration = (mins: number | null) => {
  if (!mins) return "";
  if (mins < 60) return `${mins} mins`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${hours}h ${remainingMins}m`;
};

export function TaskList({
  tasks,
  selectedDate,
  onToggleComplete,
  onDeleteTask,
  showAllTasks = false,
}: TaskListProps) {
  const filteredTasks = showAllTasks
    ? tasks
    : tasks.filter(
        (task) => task.scheduled_date === format(selectedDate, "yyyy-MM-dd")
      );

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Incomplete tasks first
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1;
    }
    // Then by date
    return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
  });

  if (sortedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center mb-4 shadow-inner">
          <Calendar className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-semibold text-lg">No tasks scheduled</p>
        <p className="text-sm text-muted-foreground/60 mt-1.5 max-w-[200px]">
          {showAllTasks
            ? "Add tasks to your study plan to get started"
            : `No tasks for ${format(selectedDate, "MMMM d")}`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedTasks.map((task, index) => {
        const style = typeStyles[task.task_type] || typeStyles.review;
        const isOverdue =
          !task.is_completed &&
          new Date(task.scheduled_date) < new Date(format(new Date(), "yyyy-MM-dd"));

        return (
          <div
            key={task.id}
            className={cn(
              "group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ease-out overflow-hidden",
              "hover:shadow-xl hover:-translate-y-1.5 hover:scale-[1.02]",
              "active:scale-[0.99] active:shadow-md active:translate-y-0",
              "animate-fade-in",
              task.is_completed
                ? "bg-muted/20 border-border/30 opacity-70 hover:opacity-100"
                : isOverdue
                ? "bg-gradient-to-r from-destructive/10 to-destructive/5 border-destructive/40 hover:border-destructive/60 hover:shadow-destructive/10"
                : cn("bg-card hover:shadow-primary/5", style.border)
            )}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            {/* Gradient accent bar on left */}
            {!task.is_completed && (
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b opacity-60 group-hover:opacity-100 transition-opacity duration-300",
                style.gradient
              )} />
            )}
            {/* Checkbox - enhanced */}
            <button
              onClick={() => onToggleComplete(task.id, !task.is_completed)}
              className="shrink-0 transition-transform duration-200 hover:scale-110 active:scale-95"
            >
              {task.is_completed ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500 drop-shadow-sm" />
              ) : isOverdue ? (
                <Circle className="h-6 w-6 text-destructive animate-pulse" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground/50 hover:text-primary transition-colors duration-200" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0 pl-1">
              <div className="flex items-center gap-2.5 mb-1">
                <span
                  className={cn(
                    "font-semibold text-sm transition-all duration-200",
                    task.is_completed && "line-through text-muted-foreground/70"
                  )}
                >
                  {task.title}
                </span>
                {isOverdue && !task.is_completed && (
                  <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-semibold animate-pulse">
                    Overdue
                  </Badge>
                )}
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground/70 truncate max-w-[300px]">
                  {task.description}
                </p>
              )}
            </div>

            {/* Meta - enhanced */}
            <div className="flex items-center gap-3 shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold px-3 py-1 rounded-full border-2 transition-all duration-200",
                  "group-hover:scale-105",
                  style.bg,
                  style.text
                )}
              >
                {style.label}
              </Badge>

              {task.estimated_duration_minutes && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">{formatDuration(task.estimated_duration_minutes)}</span>
                </div>
              )}

              {showAllTasks && (
                <span className="text-xs text-muted-foreground font-medium">
                  {format(new Date(task.scheduled_date), "MMM d")}
                </span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="animate-scale-in">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => onDeleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Hover shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
}
