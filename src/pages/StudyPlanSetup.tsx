import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Clock, Calendar as CalendarIcon, Target, BookOpen } from "lucide-react";
import { format, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useStudyTasks } from "@/hooks/useStudyTasks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlanType {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
}

const planTypes: PlanType[] = [
  {
    id: "select-study",
    name: "Select Study",
    description:
      "Best for those with limited study time. This plan includes predefined tasks for Practice Questions and Flashcards.",
    icon: FileText,
  },
  {
    id: "max-flex",
    name: "Max Flex",
    description:
      "Best for those who want maximum flexibility. Start with a blank calendar and create custom tasks.",
    icon: CalendarIcon,
  },
];

const defaultTaskTypes = [
  { id: "practice", label: "Practice Questions", defaultMins: 120 },
  { id: "flashcard", label: "Review Flashcards", defaultMins: 60 },
  { id: "tutorial", label: "Watch Tutorials", defaultMins: 30 },
];

const StudyPlanSetup = () => {
  const navigate = useNavigate();
  const { addTask } = useStudyTasks();
  
  const [selectedPlan, setSelectedPlan] = useState("select-study");
  const [selectedTasks, setSelectedTasks] = useState(["practice", "flashcard"]);
  const [studyDays, setStudyDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri
  const [hoursPerDay, setHoursPerDay] = useState([4]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 30));
  const [isCreating, setIsCreating] = useState(false);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const toggleTask = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((t) => t !== taskId) : [...prev, taskId]
    );
  };

  const toggleDay = (day: number) => {
    setStudyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleGetStarted = async () => {
    if (selectedPlan === "max-flex") {
      navigate("/study-planner");
      return;
    }

    setIsCreating(true);

    try {
      // Generate tasks for each study day
      let currentDate = new Date(startDate);
      const tasksToCreate: Array<{
        title: string;
        task_type: string;
        scheduled_date: string;
        estimated_duration_minutes: number;
      }> = [];

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        if (studyDays.includes(dayOfWeek)) {
          const dailyMinutes = hoursPerDay[0] * 60;
          const tasksPerDay = selectedTasks.length;
          const minsPerTask = Math.floor(dailyMinutes / tasksPerDay);

          for (const taskId of selectedTasks) {
            const taskType = defaultTaskTypes.find((t) => t.id === taskId);
            if (taskType) {
              tasksToCreate.push({
                title: taskType.label,
                task_type: taskId,
                scheduled_date: format(currentDate, "yyyy-MM-dd"),
                estimated_duration_minutes: minsPerTask,
              });
            }
          }
        }
        
        currentDate = addDays(currentDate, 1);
      }

      // Create all tasks
      for (const task of tasksToCreate) {
        await addTask(task);
      }

      toast.success(`Created ${tasksToCreate.length} study tasks!`);
      navigate("/study-planner");
    } catch (error) {
      toast.error("Failed to create study plan");
      console.error(error);
    }

    setIsCreating(false);
  };

  return (
    <AppLayout title="Study Planner Setup">
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Create Your Study Plan
          </h1>
          <p className="text-muted-foreground">
            Set up a personalized study schedule to reach your goals
          </p>
        </div>

        {/* Plan Type Selection */}
        <RadioGroup
          value={selectedPlan}
          onValueChange={setSelectedPlan}
          className="grid gap-4 md:grid-cols-2"
        >
          {planTypes.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const Icon = plan.icon;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "cursor-pointer transition-all",
                  isSelected
                    ? "ring-2 ring-primary border-primary"
                    : "hover:border-primary/30"
                )}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <Label htmlFor={plan.id} className="text-lg font-semibold cursor-pointer">
                          {plan.name}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </RadioGroup>

        {/* Configuration Options (only for Select Study) */}
        {selectedPlan === "select-study" && (
          <div className="space-y-6">
            {/* Task Types */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">Include in Plan</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {defaultTaskTypes.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer",
                        selectedTasks.includes(task.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                      onClick={() => toggleTask(task.id)}
                    >
                      <Checkbox
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={() => toggleTask(task.id)}
                      />
                      <span className="text-sm font-medium">{task.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Study Days */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">Study Days</h3>
                </div>
                <div className="flex gap-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(index)}
                      className={cn(
                        "flex-1 py-3 rounded-lg border text-sm font-medium transition-all",
                        studyDays.includes(index)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hours Per Day */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">Hours Per Day</h3>
                  </div>
                  <span className="text-lg font-semibold text-primary">
                    {hoursPerDay[0]} hours
                  </span>
                </div>
                <Slider
                  value={hoursPerDay}
                  onValueChange={setHoursPerDay}
                  min={1}
                  max={12}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>1 hour</span>
                  <span>12 hours</span>
                </div>
              </CardContent>
            </Card>

            {/* Date Range */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">Plan Duration</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(startDate, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(d) => d && setStartDate(d)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(endDate, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(d) => d && setEndDate(d)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Get Started Button */}
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            className="px-16 h-12 text-base font-medium"
            onClick={handleGetStarted}
            disabled={isCreating || (selectedPlan === "select-study" && selectedTasks.length === 0)}
          >
            {isCreating ? "Creating Plan..." : "Get Started"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudyPlanSetup;