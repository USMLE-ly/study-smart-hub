import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tag, Layers, Clock, Check } from "lucide-react";
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
    color?: string;
  }) => Promise<void>;
  selectedDate?: Date;
}

// Predefined color options
const TASK_COLORS = [
  { name: "Rose", value: "#f43f5e" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
];

interface QuestionMode {
  id: string;
  label: string;
  count: number;
  checked: boolean;
}

export function AddTaskDialog({ open, onOpenChange, onAddTask, selectedDate }: AddTaskDialogProps) {
  const [taskName, setTaskName] = useState("");
  const [taskType, setTaskType] = useState<"practice" | "flashcard" | "custom">("practice");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [questionModes, setQuestionModes] = useState<QuestionMode[]>([
    { id: "unused", label: "Unused", count: 4018, checked: true },
    { id: "incorrect", label: "Incorrect", count: 0, checked: false },
    { id: "marked", label: "Marked", count: 0, checked: false },
    { id: "omitted", label: "Omitted", count: 0, checked: false },
    { id: "correct", label: "Correct", count: 0, checked: false },
  ]);
  const [focusHours, setFocusHours] = useState([2]);
  const [focusDescription, setFocusDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTaskName("");
    setTaskType("practice");
    setSelectedColor("#3b82f6");
    setQuestionModes([
      { id: "unused", label: "Unused", count: 4018, checked: true },
      { id: "incorrect", label: "Incorrect", count: 0, checked: false },
      { id: "marked", label: "Marked", count: 0, checked: false },
      { id: "omitted", label: "Omitted", count: 0, checked: false },
      { id: "correct", label: "Correct", count: 0, checked: false },
    ]);
    setFocusHours([2]);
    setFocusDescription("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const toggleQuestionMode = (id: string) => {
    setQuestionModes(prev => 
      prev.map(mode => 
        mode.id === id ? { ...mode, checked: !mode.checked } : mode
      )
    );
  };

  const handleSubmit = async () => {
    if (!taskName.trim() && taskType !== "custom") return;

    setIsSubmitting(true);
    
    try {
      const title = taskType === "custom" 
        ? `Focus Time: ${focusDescription || "Study Session"}`
        : taskName.trim();

      const duration = taskType === "custom" 
        ? focusHours[0] * 60 
        : taskType === "practice" ? 90 : 60;

      await onAddTask({
        title,
        description: taskType === "custom" ? focusDescription : "",
        task_type: taskType,
        scheduled_date: format(selectedDate || new Date(), "yyyy-MM-dd"),
        estimated_duration_minutes: duration,
        color: selectedColor,
      });
      
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold">Add Task</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Task Name with Color Picker */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-[hsl(330,81%,60%)]" />
              <Label className="text-sm font-medium">Task Name *</Label>
            </div>
            <div className="flex items-center gap-2">
              {/* Color Picker Circle */}
              <div className="relative">
                <button
                  type="button"
                  className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center hover:border-primary transition-colors"
                  style={{ backgroundColor: selectedColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  </div>
                </button>
                {/* Color Options Dropdown */}
                {showColorPicker && (
                  <div className="absolute top-12 left-0 z-50 bg-popover border border-border rounded-lg p-2 shadow-lg grid grid-cols-4 gap-1.5 min-w-[140px]">
                    {TASK_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color.value);
                          setShowColorPicker(false);
                        }}
                        className={cn(
                          "w-7 h-7 rounded-full transition-all hover:scale-110",
                          selectedColor === color.value && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                )}
              </div>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Enter task name..."
                className="h-10 flex-1"
              />
            </div>
          </div>

          {/* Task Type */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Task Type</Label>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setTaskType("practice")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  taskType === "practice" 
                    ? "text-primary border border-primary bg-primary/5" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {taskType === "practice" && <Check className="h-4 w-4" />}
                Practice Questions
              </button>
              <button
                type="button"
                onClick={() => setTaskType("flashcard")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  taskType === "flashcard" 
                    ? "text-primary border border-primary bg-primary/5" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {taskType === "flashcard" && <Check className="h-4 w-4" />}
                Flashcards
              </button>
              <button
                type="button"
                onClick={() => setTaskType("custom")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  taskType === "custom" 
                    ? "text-primary border border-primary bg-primary/5" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {taskType === "custom" && <Check className="h-4 w-4" />}
                Focus Time
              </button>
            </div>
          </div>

          {/* Conditional content based on task type */}
          {taskType === "practice" && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Question Mode</Label>
                <div className="grid grid-cols-2 gap-3">
                  {questionModes.map((mode) => (
                    <div key={mode.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={mode.id}
                          checked={mode.checked}
                          onCheckedChange={() => toggleQuestionMode(mode.id)}
                        />
                        <Label htmlFor={mode.id} className="text-sm cursor-pointer">
                          {mode.label}
                        </Label>
                      </div>
                      <span className={cn(
                        "text-sm px-2 py-0.5 rounded-full border",
                        mode.count > 0 
                          ? "border-primary/30 text-primary" 
                          : "border-border text-muted-foreground"
                      )}>
                        {mode.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {taskType === "flashcard" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Flashcard Deck</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Review flashcards will be scheduled based on your spaced repetition settings.
              </p>
            </div>
          )}

          {taskType === "custom" && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Focus Duration</Label>
                </div>
                <div className="space-y-4">
                  <Slider
                    value={focusHours}
                    onValueChange={setFocusHours}
                    min={1}
                    max={8}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>1 hr</span>
                    <span className="text-primary font-medium">{focusHours[0]} hours</span>
                    <span>8 hrs</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description (optional)</Label>
                <Input
                  value={focusDescription}
                  onChange={(e) => setFocusDescription(e.target.value)}
                  placeholder="What will you focus on?"
                  className="h-10"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div></div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={(taskType !== "custom" && !taskName.trim()) || isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
