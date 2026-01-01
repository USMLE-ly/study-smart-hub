import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Save, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<{ error?: Error }>;
  onDelete: (taskId: string) => Promise<{ error?: Error }>;
  onToggleComplete: (taskId: string, completed: boolean) => Promise<{ error?: Error }>;
}

const taskTypeOptions = [
  { value: "practice", label: "Practice Questions", color: "bg-[hsl(330,81%,60%)]" },
  { value: "flashcard", label: "Flashcards", color: "bg-[hsl(38,92%,50%)]" },
  { value: "review", label: "Review", color: "bg-[hsl(142,71%,45%)]" },
  { value: "focus", label: "Focus Session", color: "bg-primary" },
];

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onToggleComplete,
}: TaskDetailSheetProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("practice");
  const [scheduledDate, setScheduledDate] = useState("");
  const [duration, setDuration] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setTaskType(task.task_type);
      setScheduledDate(task.scheduled_date);
      setDuration(task.estimated_duration_minutes || 60);
    }
  }, [task]);

  // Animate content when sheet opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!task) return;
    setIsLoading(true);
    await onUpdate(task.id, {
      title,
      description,
      task_type: taskType,
      scheduled_date: scheduledDate,
      estimated_duration_minutes: duration,
    });
    setIsLoading(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsLoading(true);
    await onDelete(task.id);
    setIsLoading(false);
    onOpenChange(false);
  };

  const handleToggle = async () => {
    if (!task) return;
    setIsLoading(true);
    await onToggleComplete(task.id, !task.is_completed);
    setIsLoading(false);
  };

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center justify-between">
            <span 
              className={cn(
                "transition-all duration-300",
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              )}
            >
              Edit Task
            </span>
            <Button
              variant={task.is_completed ? "secondary" : "outline"}
              size="sm"
              onClick={handleToggle}
              disabled={isLoading}
              className={cn(
                "gap-2 transition-all duration-300 hover:scale-105 active:scale-95",
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4",
                task.is_completed && "bg-[hsl(142,71%,45%)]/20 text-[hsl(142,71%,35%)] hover:bg-[hsl(142,71%,45%)]/30"
              )}
            >
              <CheckCircle2 className={cn("h-4 w-4 transition-transform duration-300", task.is_completed && "scale-110")} />
              {task.is_completed ? "Completed" : "Mark Complete"}
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          <div 
            className={cn(
              "space-y-2 transition-all duration-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: "50ms" }}
          >
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="transition-all duration-200 focus:scale-[1.01]"
            />
          </div>

          <div 
            className={cn(
              "space-y-2 transition-all duration-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: "100ms" }}
          >
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="transition-all duration-200 focus:scale-[1.01]"
            />
          </div>

          <div 
            className={cn(
              "space-y-2 transition-all duration-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: "150ms" }}
          >
            <Label htmlFor="type">Task Type</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taskTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full transition-transform duration-200 hover:scale-110", option.color)} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div 
            className={cn(
              "grid grid-cols-2 gap-4 transition-all duration-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="transition-all duration-200 focus:scale-[1.01]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration (min)
              </Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                className="transition-all duration-200 focus:scale-[1.01]"
              />
            </div>
          </div>

          {task.completed_at && (
            <div 
              className={cn(
                "p-3 rounded-lg bg-[hsl(142,71%,95%)] border border-[hsl(142,71%,45%)]/30 transition-all duration-300",
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
              )}
              style={{ transitionDelay: "250ms" }}
            >
              <p className="text-sm text-[hsl(142,71%,35%)]">
                ✓ Completed on {format(new Date(task.completed_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          )}

          <div 
            className={cn(
              "flex gap-3 pt-4 transition-all duration-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: "300ms" }}
          >
            <Button
              variant="destructive"
              className="flex-1 gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-95"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
              Delete Task
            </Button>
            <Button
              className="flex-1 gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-95"
              onClick={handleSave}
              disabled={isLoading}
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
