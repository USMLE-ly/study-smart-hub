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

const typeStyles: Record<string, { bg: string; text: string; label: string }> = {
  practice: {
    bg: "bg-[hsl(330,81%,60%)]/10",
    text: "text-[hsl(330,81%,60%)]",
    label: "Practice",
  },
  flashcard: {
    bg: "bg-[hsl(38,92%,50%)]/10",
    text: "text-[hsl(30,80%,40%)]",
    label: "Flashcards",
  },
  tutorial: {
    bg: "bg-[hsl(142,71%,45%)]/10",
    text: "text-[hsl(142,71%,45%)]",
    label: "Tutorial",
  },
  review: {
    bg: "bg-primary/10",
    text: "text-primary",
    label: "Review",
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground font-medium">No tasks scheduled</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {showAllTasks
            ? "Add tasks to your study plan"
            : `No tasks for ${format(selectedDate, "MMMM d")}`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedTasks.map((task) => {
        const style = typeStyles[task.task_type] || typeStyles.review;
        const isOverdue =
          !task.is_completed &&
          new Date(task.scheduled_date) < new Date(format(new Date(), "yyyy-MM-dd"));

        return (
          <div
            key={task.id}
            className={cn(
              "group flex items-center gap-4 p-4 rounded-lg border transition-all",
              task.is_completed
                ? "bg-muted/30 border-border/40"
                : isOverdue
                ? "bg-destructive/5 border-destructive/30"
                : "bg-card border-border/60 hover:border-primary/30 hover:shadow-sm"
            )}
          >
            {/* Checkbox */}
            <button
              onClick={() => onToggleComplete(task.id, !task.is_completed)}
              className="shrink-0"
            >
              {task.is_completed ? (
                <CheckCircle2 className="h-5 w-5 text-[hsl(142,71%,45%)]" />
              ) : isOverdue ? (
                <Circle className="h-5 w-5 text-destructive" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "font-medium text-sm",
                    task.is_completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </span>
                {isOverdue && !task.is_completed && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    Overdue
                  </Badge>
                )}
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {task.description}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium px-2.5 py-0.5 rounded-full border",
                  style.bg,
                  style.text
                )}
              >
                {style.label}
              </Badge>

              {task.estimated_duration_minutes && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDuration(task.estimated_duration_minutes)}</span>
                </div>
              )}

              {showAllTasks && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(task.scheduled_date), "MMM d")}
                </span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDeleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
