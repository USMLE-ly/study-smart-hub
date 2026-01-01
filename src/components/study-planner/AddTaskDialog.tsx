import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarIcon, BookOpen, FileText, Layers, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (task: {
    title: string;
    description: string;
    task_type: string;
    scheduled_date: string;
    estimated_duration_minutes: number;
  }) => void;
  selectedDate?: Date;
}

const taskTypes = [
  { id: "practice", label: "Practice Questions", icon: FileText, color: "text-[hsl(330,81%,60%)]" },
  { id: "flashcard", label: "Review Flashcards", icon: Layers, color: "text-[hsl(38,92%,50%)]" },
  { id: "tutorial", label: "Watch Tutorial", icon: GraduationCap, color: "text-[hsl(142,71%,45%)]" },
  { id: "review", label: "Topic Review", icon: BookOpen, color: "text-primary" },
];

const presetTasks = [
  { title: "Shelf Review", type: "review" },
  { title: "Step 2 Review", type: "review" },
  { title: "Practice Questions Block", type: "practice" },
  { title: "Anki Flashcards", type: "flashcard" },
  { title: "Lecture Review", type: "tutorial" },
];

export function AddTaskDialog({ open, onOpenChange, onAddTask, selectedDate }: AddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("practice");
  const [date, setDate] = useState<Date>(selectedDate || new Date());
  const [duration, setDuration] = useState([60]); // minutes

  const handleSubmit = () => {
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      description: description.trim(),
      task_type: taskType,
      scheduled_date: format(date, "yyyy-MM-dd"),
      estimated_duration_minutes: duration[0],
    });

    // Reset form
    setTitle("");
    setDescription("");
    setTaskType("practice");
    setDuration([60]);
    onOpenChange(false);
  };

  const selectPreset = (preset: { title: string; type: string }) => {
    setTitle(preset.title);
    setTaskType(preset.type);
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} mins`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
    return `${hours} hr${hours > 1 ? "s" : ""}, ${remainingMins} mins`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Study Task</DialogTitle>
          <DialogDescription>
            Create a new task for your study plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Add</Label>
            <div className="flex flex-wrap gap-2">
              {presetTasks.map((preset) => (
                <Button
                  key={preset.title}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => selectPreset(preset)}
                >
                  {preset.title}
                </Button>
              ))}
            </div>
          </div>

          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Name</Label>
            <Input
              id="title"
              placeholder="e.g., Review Cardiology"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Task Type */}
          <div className="space-y-3">
            <Label>Task Type</Label>
            <RadioGroup
              value={taskType}
              onValueChange={setTaskType}
              className="grid grid-cols-2 gap-3"
            >
              {taskTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div key={type.id}>
                    <RadioGroupItem
                      value={type.id}
                      id={type.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border-2 border-border p-3 cursor-pointer transition-all",
                        "hover:border-primary/50 hover:bg-accent/50",
                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", type.color)} />
                      <span className="text-sm font-medium">{type.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Scheduled Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "EEEE, MMMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Duration Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Estimated Time</Label>
              <span className="text-sm font-medium text-primary">
                {formatDuration(duration[0])}
              </span>
            </div>
            <Slider
              value={duration}
              onValueChange={setDuration}
              min={15}
              max={480}
              step={15}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15 mins</span>
              <span>8 hours</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any additional notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
