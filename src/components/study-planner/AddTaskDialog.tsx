import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tag, FileText, Layers, Clock, Check } from "lucide-react";
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
  }) => Promise<void>;
  selectedDate?: Date;
}

interface QuestionMode {
  id: string;
  label: string;
  count: number;
  checked: boolean;
}

export function AddTaskDialog({ open, onOpenChange, onAddTask, selectedDate }: AddTaskDialogProps) {
  const [taskName, setTaskName] = useState("");
  const [taskType, setTaskType] = useState<"practice" | "flashcard" | "focus">("practice");
  const [preselection, setPreselection] = useState<"shelf" | "step2">("shelf");
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
    setPreselection("shelf");
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
    if (!taskName.trim() && taskType !== "focus") return;

    setIsSubmitting(true);
    
    try {
      const title = taskType === "focus" 
        ? `Focus Time: ${focusDescription || "Study Session"}`
        : taskName.trim();

      const duration = taskType === "focus" 
        ? focusHours[0] * 60 
        : taskType === "practice" ? 90 : 60;

      await onAddTask({
        title,
        description: taskType === "focus" ? focusDescription : "",
        task_type: taskType,
        scheduled_date: format(selectedDate || new Date(), "yyyy-MM-dd"),
        estimated_duration_minutes: duration,
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
          {/* Task Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-[hsl(330,81%,60%)]" />
              <Label className="text-sm font-medium">Task Name *</Label>
            </div>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Enter task name..."
              className="h-10"
            />
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
                onClick={() => setTaskType("focus")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  taskType === "focus" 
                    ? "text-primary border border-primary bg-primary/5" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {taskType === "focus" && <Check className="h-4 w-4" />}
                Focus Time
              </button>
            </div>
          </div>

          {/* Conditional content based on task type */}
          {taskType === "practice" && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Preselections</Label>
                </div>
                <RadioGroup 
                  value={preselection} 
                  onValueChange={(val) => setPreselection(val as "shelf" | "step2")}
                  className="flex gap-8"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="shelf" id="shelf" />
                    <Label htmlFor="shelf" className="text-sm cursor-pointer">Shelf Review</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="step2" id="step2" />
                    <Label htmlFor="step2" className="text-sm cursor-pointer">Step 2 Review</Label>
                  </div>
                </RadioGroup>
              </div>

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

          {taskType === "focus" && (
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
              disabled={(taskType !== "focus" && !taskName.trim()) || isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
