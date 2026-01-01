import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, List, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { StudyCalendar } from "@/components/study-planner/StudyCalendar";
import { TaskList } from "@/components/study-planner/TaskList";
import { AddTaskDialog } from "@/components/study-planner/AddTaskDialog";
import { ProgressOverview } from "@/components/study-planner/ProgressOverview";
import { useStudyTasks } from "@/hooks/useStudyTasks";
import { LoadingState } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";

const StudyPlanner = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  
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

  // Convert tasks to calendar format
  const calendarTasks = tasks.map((t) => ({
    id: t.id,
    date: t.scheduled_date,
    type: t.task_type as "practice" | "flashcard" | "tutorial" | "review",
    status: t.is_completed
      ? "completed"
      : t.scheduled_date < format(new Date(), "yyyy-MM-dd")
      ? "overdue"
      : "pending",
  })) as { id: string; date: string; type: "practice" | "flashcard" | "tutorial" | "review"; status: "completed" | "pending" | "overdue" }[];

  if (loading) {
    return (
      <AppLayout title="Study Planner">
        <LoadingState message="Loading your study plan..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Study Planner">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Study Planner</h2>
            <p className="text-muted-foreground mt-1">
              Organize your study schedule and track progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            {stats.overdue > 0 && (
              <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                Overdue
                <Badge variant="destructive" className="ml-1">
                  {stats.overdue}
                </Badge>
              </Button>
            )}
            <Button onClick={() => setShowAddTask(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>

        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")}>
          <TabsList className="bg-muted/30">
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Calendar */}
              <div className="lg:col-span-2">
                <StudyCalendar
                  tasks={calendarTasks}
                  onDateSelect={setSelectedDate}
                  selectedDate={selectedDate}
                />

                {/* Selected Day Tasks */}
                <div className="mt-6 bg-card rounded-lg border border-border/60 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-foreground">
                      {format(selectedDate, "EEEE, MMMM d")}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddTask(true)}
                      className="gap-1 text-primary"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  <TaskList
                    tasks={tasks}
                    selectedDate={selectedDate}
                    onToggleComplete={handleToggleComplete}
                    onDeleteTask={handleDeleteTask}
                  />
                </div>
              </div>

              {/* Progress Sidebar */}
              <div>
                <ProgressOverview
                  totalTasks={stats.total}
                  completedTasks={stats.completed}
                  overdueTasks={stats.overdue}
                  totalTimeMinutes={stats.totalTimeMinutes}
                  completedTimeMinutes={stats.completedTimeMinutes}
                  daysRemaining={stats.daysRemaining}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="bg-card rounded-lg border border-border/60 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-foreground">All Tasks</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddTask(true)}
                      className="gap-1 text-primary"
                    >
                      <Plus className="h-4 w-4" />
                      Add Task
                    </Button>
                  </div>
                  <TaskList
                    tasks={tasks}
                    selectedDate={selectedDate}
                    onToggleComplete={handleToggleComplete}
                    onDeleteTask={handleDeleteTask}
                    showAllTasks
                  />
                </div>
              </div>

              <div>
                <ProgressOverview
                  totalTasks={stats.total}
                  completedTasks={stats.completed}
                  overdueTasks={stats.overdue}
                  totalTimeMinutes={stats.totalTimeMinutes}
                  completedTimeMinutes={stats.completedTimeMinutes}
                  daysRemaining={stats.daysRemaining}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        onAddTask={handleAddTask}
        selectedDate={selectedDate}
      />
    </AppLayout>
  );
};

export default StudyPlanner;
