import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  Plus
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isSameDay } from "date-fns";
import { StudyCalendarGrid } from "@/components/study-planner/StudyCalendarGrid";
import { AddTaskDialog } from "@/components/study-planner/AddTaskDialog";
import { useStudyTasks } from "@/hooks/useStudyTasks";
import { LoadingState } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const StudyPlanner = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState("month");
  
  const { tasks, loading, addTask, toggleComplete, deleteTask, stats } = useStudyTasks();

  const handleAddTask = async (task: {
    title: string;
    description: string;
    task_type: string;
    scheduled_date: string;
    estimated_duration_minutes: number;
  }) => {
    const { error } = await addTask(task);
    if (error) {
      toast.error("Failed to add task");
    } else {
      toast.success("Task added successfully");
      setShowAddTask(false);
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    const { error } = await toggleComplete(taskId, completed);
    if (error) {
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await deleteTask(taskId);
    if (error) {
      toast.error("Failed to delete task");
    } else {
      toast.success("Task deleted");
    }
  };

  const openAddTaskForDate = (date: Date) => {
    setSelectedDate(date);
    setShowAddTask(true);
  };

  if (loading) {
    return (
      <AppLayout title="Study Planner">
        <LoadingState message="Loading your study plan..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Study Planner">
      <div className="flex flex-col min-h-[calc(100vh-8rem)] bg-muted/30 -m-6 p-6">
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Today Button */}
            <Button 
              variant="outline" 
              onClick={() => setCurrentMonth(new Date())}
              className="h-9"
            >
              Today
            </Button>

            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Current Month/Year */}
            <h2 className="text-xl font-semibold text-foreground">
              {format(currentMonth, "MMMM, yyyy")}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Overdue Tasks Badge */}
            {stats.overdue > 0 && (
              <Button 
                variant="outline" 
                className="h-9 gap-2 border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
              >
                Overdue Tasks
                <Badge variant="secondary" className="bg-destructive/20 text-destructive hover:bg-destructive/20">
                  {stats.overdue}
                </Badge>
              </Button>
            )}

            {/* View Mode Selector */}
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month View</SelectItem>
                <SelectItem value="week">Week View</SelectItem>
              </SelectContent>
            </Select>

            {/* Settings */}
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 min-h-[500px] bg-card rounded-lg border border-border overflow-hidden">
          <StudyCalendarGrid
            currentMonth={currentMonth}
            tasks={tasks}
            onAddTask={openAddTaskForDate}
            onToggleComplete={handleToggleComplete}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        onAddTask={handleAddTask}
        selectedDate={selectedDate || new Date()}
      />
    </AppLayout>
  );
};

export default StudyPlanner;
