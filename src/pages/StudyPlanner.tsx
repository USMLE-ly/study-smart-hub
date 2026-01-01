import { useState, useEffect, useRef } from "react";
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
  Sparkles,
  Music,
  Keyboard,
  CalendarDays
} from "lucide-react";
import { useConfetti } from "@/hooks/useConfetti";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { format, addMonths, subMonths, differenceInDays, parseISO, eachDayOfInterval, getDay } from "date-fns";
import { StudyCalendarGrid } from "@/components/study-planner/StudyCalendarGrid";
import { AddTaskDialog } from "@/components/study-planner/AddTaskDialog";
import { TaskDetailSheet } from "@/components/study-planner/TaskDetailSheet";
import { FocusModeTimer } from "@/components/study-planner/FocusModeTimer";
import { PremiumProgressPanel } from "@/components/study-planner/PremiumProgressPanel";
import { AIStudyAssistant } from "@/components/ai/AIStudyAssistant";
import { GamificationWidget } from "@/components/gamification/GamificationWidget";
import { StudyDaysSelector } from "@/components/study-planner/StudyDaysSelector";
import { DateRangePicker } from "@/components/study-planner/DateRangePicker";
import { BlockedDatesManager } from "@/components/study-planner/BlockedDatesManager";
import { useStudyTasks, StudyTask } from "@/hooks/useStudyTasks";
import { useStudySchedule } from "@/hooks/useStudySchedule";
import { LoadingState } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";

const StudyPlanner = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState("month");
  const [selectedTask, setSelectedTask] = useState<StudyTask | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [focusTask, setFocusTask] = useState<StudyTask | null>(null);
  
  // Setup mode vs Calendar mode
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [planCreated, setPlanCreated] = useState(false);
  
  // Date range picker state
  const [dateRangeOpen, setDateRangeOpen] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const { tasks, loading, addTask, updateTask, toggleComplete, deleteTask, stats } = useStudyTasks();
  const { schedule: savedSchedule, saveSchedule, updateBlockedDates } = useStudySchedule();
  const { profile } = useProfile();
  const { triggerConfetti, triggerStars } = useConfetti();
  const { playTaskComplete, playAchievement } = useSoundEffects({ volume: 0.3, enabled: true });
  const prevCompletedRef = useRef<number>(0);

  // Load saved schedule on mount and check if plan exists
  useEffect(() => {
    if (savedSchedule) {
      if (savedSchedule.start_date) {
        setStartDate(parseISO(savedSchedule.start_date));
      }
      if (savedSchedule.end_date) {
        setEndDate(parseISO(savedSchedule.end_date));
      }
      // If schedule exists with data and tasks exist, show calendar mode
      if (savedSchedule.schedule_data && Array.isArray(savedSchedule.schedule_data) && savedSchedule.schedule_data.length > 0) {
        setIsSetupMode(false);
        setPlanCreated(true);
      }
    }
  }, [savedSchedule]);

  // Also check if tasks already exist
  useEffect(() => {
    if (!loading && tasks.length > 0) {
      setIsSetupMode(false);
      setPlanCreated(true);
    }
  }, [loading, tasks.length]);

  // Track completed tasks for confetti trigger
  useEffect(() => {
    if (!loading && tasks.length > 0) {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const todayTasks = tasks.filter(t => t.scheduled_date === todayStr);
      const completedToday = todayTasks.filter(t => t.is_completed).length;
      const totalToday = todayTasks.length;

      // All daily tasks completed - big celebration!
      if (totalToday > 0 && completedToday === totalToday && prevCompletedRef.current < totalToday) {
        triggerConfetti();
        playAchievement();
        toast.success("🎉 All daily tasks completed! Amazing work!");
      }
      // Milestone: 5 tasks completed
      else if (completedToday >= 5 && prevCompletedRef.current < 5) {
        triggerStars();
        playAchievement();
        toast.success("⭐ 5 tasks completed! Keep it up!");
      }

      prevCompletedRef.current = completedToday;
    }
  }, [tasks, loading, triggerConfetti, triggerStars, playAchievement]);

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
    } else if (completed) {
      // Small celebration for individual task completion
      playTaskComplete();
      toast.success("✓ Task completed!");
    }
    return { error };
  };

  // Keyboard shortcuts
  const { showShortcutsHelp } = useKeyboardShortcuts({
    onAddTask: () => {
      setSelectedDate(new Date());
      setShowAddTask(true);
    },
    onStartFocus: () => handleStartFocusMode(),
    onTogglePanel: () => setShowRightPanel(prev => !prev),
  });

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

  const handleStartFocusMode = (task?: StudyTask) => {
    const taskToFocus = task || tasks.find(
      (t) => !t.is_completed && t.scheduled_date === format(new Date(), "yyyy-MM-dd")
    ) || null;
    setFocusTask(taskToFocus);
    setFocusMode(true);
  };

  const handleFocusComplete = async () => {
    if (focusTask) {
      await handleToggleComplete(focusTask.id, true);
    }
    setFocusMode(false);
    setFocusTask(null);
  };

  // Handle creating the study plan and generating tasks
  const handleCreatePlan = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select a start and end date for your study plan");
      return;
    }
    
    const scheduleData = savedSchedule?.schedule_data || [];
    if (!Array.isArray(scheduleData) || scheduleData.length === 0) {
      toast.error("Please configure your study days and hours");
      return;
    }

    // Check if any day has hours > 0
    const hasStudyDays = scheduleData.some((s: any) => s.enabled && s.hours > 0);
    if (!hasStudyDays) {
      toast.error("Please select at least one study day with hours");
      return;
    }

    // Generate sample tasks based on the schedule
    const blockedDates = savedSchedule?.blocked_dates || [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const studyDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    for (const day of studyDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Skip blocked dates
      if (blockedDates.includes(dateStr)) continue;
      
      // Check if this day is a study day
      const dayName = dayNames[getDay(day)];
      const daySchedule = scheduleData.find((s: any) => s.day === dayName && s.enabled);
      
      if (daySchedule && daySchedule.hours > 0) {
        // Add practice questions task
        await addTask({
          title: "Practice Questions",
          description: "Complete practice questions for exam preparation",
          task_type: "practice",
          scheduled_date: dateStr,
          estimated_duration_minutes: Math.round(daySchedule.hours * 30),
        });
        
        // Add flashcard review task
        await addTask({
          title: "Review Flashcards",
          description: "Review flashcards using spaced repetition",
          task_type: "flashcard",
          scheduled_date: dateStr,
          estimated_duration_minutes: Math.round(daySchedule.hours * 30),
        });
      }
    }

    await saveSchedule(scheduleData, startDate, endDate);
    setIsSetupMode(false);
    setPlanCreated(true);
    triggerConfetti();
    toast.success("🎉 Study plan created successfully!");
  };

  // Calculate stats for progress panel
  const totalTimeMinutes = tasks.reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0);
  const completedTimeMinutes = tasks
    .filter(t => t.is_completed)
    .reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0);
  
  const targetExamDate = profile?.target_exam_date ? new Date(profile.target_exam_date) : null;
  const daysRemaining = targetExamDate ? Math.max(0, differenceInDays(targetExamDate, new Date())) : 30;

  if (loading) {
    return (
      <AppLayout title="Study Planner">
        <LoadingState message="Loading your study plan..." />
      </AppLayout>
    );
  }

  // Focus mode with ambient sounds timer
  if (focusMode) {
    return (
      <FocusModeTimer
        task={focusTask}
        onComplete={handleFocusComplete}
        onClose={() => {
          setFocusMode(false);
          setFocusTask(null);
        }}
      />
    );
  }

  // Setup Mode UI - Show when no plan exists
  if (isSetupMode && !planCreated) {
    return (
      <AppLayout title="Study Planner">
        <div className="min-h-[calc(100vh-8rem)] bg-muted/30 -m-6 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Create Your Study Plan</h1>
              <p className="text-muted-foreground">Set up your personalized study schedule</p>
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              isOpen={dateRangeOpen}
              onOpenChange={setDateRangeOpen}
              onSave={async () => {
                const scheduleData = savedSchedule?.schedule_data || [];
                await saveSchedule(scheduleData, startDate, endDate);
                toast.success("Date range saved");
              }}
              onReset={() => {
                setStartDate(null);
                setEndDate(null);
              }}
            />

            {/* Blocked Dates Manager */}
            <BlockedDatesManager
              blockedDates={savedSchedule?.blocked_dates || []}
              onBlockedDatesChange={async (dates) => {
                await updateBlockedDates(dates);
                toast.success("Blocked dates updated");
              }}
            />

            {/* Study Days Selector */}
            <StudyDaysSelector 
              totalTimeNeeded={100}
              initialSchedule={savedSchedule?.schedule_data}
              onScheduleChange={async (schedule) => {
                await saveSchedule(schedule, startDate, endDate);
              }}
            />

            {/* Create Plan Button - Footer Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePlan}
                size="lg"
                className="gap-2 px-8"
                disabled={!startDate || !endDate}
              >
                <CalendarDays className="h-4 w-4" />
                Create Plan
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Calendar Mode - Show after plan is created
  return (
    <AppLayout title="Study Planner">
      <div className="flex gap-6 min-h-[calc(100vh-8rem)] bg-muted/30 -m-6 p-4 sm:p-6">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
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
              {/* Focus Mode Button with ambient sounds */}
              <Button
                variant="outline"
                onClick={() => handleStartFocusMode()}
                className="h-9 gap-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/30 hover:from-purple-500/20 hover:to-indigo-500/20"
              >
                <Music className="h-4 w-4 text-purple-500" />
                <span className="hidden sm:inline">Focus Mode</span>
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

              {/* Toggle Right Panel */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 hidden lg:flex"
                onClick={() => setShowRightPanel(!showRightPanel)}
              >
                <Sparkles className={cn("h-4 w-4 transition-colors", showRightPanel && "text-primary")} />
              </Button>

              {/* Keyboard Shortcuts Help */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={showShortcutsHelp}
                title="Keyboard shortcuts (Ctrl+/)"
              >
                <Keyboard className="h-4 w-4" />
              </Button>

              {/* Settings */}
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 min-h-[500px] bg-card rounded-lg border border-border overflow-hidden shadow-sm">
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

        {/* Right Side Panel - Premium Features */}
        {showRightPanel && (
          <div className="hidden lg:flex flex-col w-80 space-y-4 animate-slide-in-right">
            {/* Premium Progress Panel */}
            <PremiumProgressPanel
              totalTasks={stats.total}
              completedTasks={stats.completed}
              overdueTasks={stats.overdue}
              totalTimeMinutes={totalTimeMinutes}
              completedTimeMinutes={completedTimeMinutes}
              daysRemaining={daysRemaining}
            />

            {/* Gamification Widget */}
            <GamificationWidget compact />

            {/* AI Study Assistant */}
            <AIStudyAssistant
              context={{
                completedTasks: stats.completed,
                pendingTasks: stats.total - stats.completed,
              }}
            />
          </div>
        )}
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