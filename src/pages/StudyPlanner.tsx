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
  Plus,
  Focus,
  X
} from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { StudyCalendarGrid } from "@/components/study-planner/StudyCalendarGrid";
import { AddTaskDialog } from "@/components/study-planner/AddTaskDialog";
import { TaskDetailSheet } from "@/components/study-planner/TaskDetailSheet";
import { useStudyTasks, StudyTask } from "@/hooks/useStudyTasks";
import { LoadingState } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const StudyPlanner = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState("month");
  const [selectedTask, setSelectedTask] = useState<StudyTask | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  
  const { tasks, loading, addTask, updateTask, toggleComplete, deleteTask, stats } = useStudyTasks();

  const handleAddTask = async (task: {
    title: string;
    description: string;
    task_type: string;
    scheduled_date: string;
    estimated_duration_minutes: number;
  }) => {
    const { error } = await addTask(task);
    if (error) {
      toast.error("Failed to add task: " + (error.message || "Unknown error"));
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
    return { error };
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await deleteTask(taskId);
    if (error) {
      toast.error("Failed to delete task");
    } else {
      toast.success("Task deleted");
    }
    return { error };
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<StudyTask>) => {
    const { error } = await updateTask(taskId, updates);
    if (error) {
      toast.error("Failed to update task");
    } else {
      toast.success("Task updated");
    }
    return { error };
  };

  const handleMoveTask = async (taskId: string, newDate: string) => {
    const { error } = await updateTask(taskId, { scheduled_date: newDate });
    if (error) {
      toast.error("Failed to move task");
    } else {
      toast.success("Task moved to " + format(new Date(newDate), "MMM d"));
    }
  };

  const handleTaskClick = (task: StudyTask) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
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

  // If no tasks, show empty state with option to create plan
  if (tasks.length === 0) {
    return (
      <AppLayout title="Study Planner">
        <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-muted/30 -m-6 p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">No Study Plan Yet</h2>
            <p className="text-muted-foreground mb-6">
              Create a personalized study plan to organize your learning and track your progress.
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link to="/study-planner/setup">Create Study Plan</Link>
              </Button>
              <Button variant="outline" onClick={() => setShowAddTask(true)}>
                Add Quick Task
              </Button>
            </div>
          </div>
          
          {/* Add Task Dialog */}
          <AddTaskDialog
            open={showAddTask}
            onOpenChange={setShowAddTask}
            onAddTask={handleAddTask}
            selectedDate={selectedDate || new Date()}
          />
        </div>
      </AppLayout>
    );
  }

  // Focus mode view
  if (focusMode) {
    const todaysTasks = tasks.filter(
      (t) => !t.is_completed && t.scheduled_date === format(new Date(), "yyyy-MM-dd")
    );
    const currentFocusTask = todaysTasks[0];

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-8">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={() => setFocusMode(false)}
        >
          <X className="h-6 w-6" />
        </Button>
        
        <div className="text-center max-w-lg">
          <h1 className="text-4xl font-bold text-foreground mb-2">Focus Mode</h1>
          <p className="text-muted-foreground mb-8">Stay focused on your current task</p>
          
          {currentFocusTask ? (
            <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Focus className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">{currentFocusTask.title}</h2>
              {currentFocusTask.description && (
                <p className="text-muted-foreground mb-4">{currentFocusTask.description}</p>
              )}
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-6">
                <span className="capitalize">{currentFocusTask.task_type}</span>
                {currentFocusTask.estimated_duration_minutes && (
                  <>
                    <span>•</span>
                    <span>{currentFocusTask.estimated_duration_minutes} min</span>
                  </>
                )}
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={() => handleToggleComplete(currentFocusTask.id, true)}
              >
                Mark Complete
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-8">
              <p className="text-lg text-muted-foreground">
                All tasks for today are complete! 🎉
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setFocusMode(false)}
              >
                Exit Focus Mode
              </Button>
            </div>
          )}
          
          {todaysTasks.length > 1 && (
            <p className="text-sm text-muted-foreground mt-6">
              {todaysTasks.length - 1} more task{todaysTasks.length > 2 ? "s" : ""} remaining today
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <AppLayout title="Study Planner">
      <div className="flex flex-col min-h-[calc(100vh-8rem)] bg-muted/30 -m-6 p-4 sm:p-6">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Today Button */}
            <Button 
              variant="outline" 
              onClick={() => setCurrentMonth(new Date())}
              className="h-9"
            >
              Today
            </Button>

            {/* Month Navigation */}
            <div className="flex items-center gap-1">
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
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              {format(currentMonth, "MMMM, yyyy")}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Focus Mode Button */}
            <Button
              variant="outline"
              onClick={() => setFocusMode(true)}
              className="h-9 gap-2"
            >
              <Focus className="h-4 w-4" />
              <span className="hidden sm:inline">Focus</span>
            </Button>

            {/* Overdue Tasks Badge */}
            {stats.overdue > 0 && (
              <Button 
                variant="outline" 
                className="h-9 gap-2 border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
              >
                <span className="hidden sm:inline">Overdue</span>
                <Badge variant="secondary" className="bg-destructive/20 text-destructive hover:bg-destructive/20">
                  {stats.overdue}
                </Badge>
              </Button>
            )}

            {/* Add Task Button */}
            <Button 
              onClick={() => {
                setSelectedDate(new Date());
                setShowAddTask(true);
              }}
              className="h-9 gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Task</span>
            </Button>

            {/* View Mode Selector */}
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-[100px] sm:w-[140px] h-9">
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
            onToggleComplete={(id, completed) => {
              handleToggleComplete(id, completed);
            }}
            onDeleteTask={(id) => {
              handleDeleteTask(id);
            }}
            onTaskClick={handleTaskClick}
            onMoveTask={handleMoveTask}
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

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={showTaskDetail}
        onOpenChange={setShowTaskDetail}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onToggleComplete={handleToggleComplete}
      />
    </AppLayout>
  );
};

export default StudyPlanner;
