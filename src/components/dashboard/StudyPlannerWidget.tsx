import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ChevronRight, Plus, BookOpen, Brain, FileText, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useStudyTasks } from "@/hooks/useStudyTasks";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

const typeLabels: Record<string, string> = {
  tutorial: "Tutorial",
  practice: "Practice",
  flashcard: "Flashcards",
  review: "Review",
};

const typeIcons: Record<string, React.ElementType> = {
  tutorial: BookOpen,
  practice: FileText,
  flashcard: Brain,
  review: RotateCcw,
};

const getBadgeClasses = (type: string) => {
  switch (type) {
    case "tutorial":
      return "bg-[hsl(var(--badge-success))]/10 text-[hsl(var(--badge-success))] border-[hsl(var(--badge-success))]/20";
    case "practice":
      return "bg-[hsl(var(--badge-practice))]/10 text-[hsl(var(--badge-practice))] border-[hsl(var(--badge-practice))]/20";
    case "flashcard":
      return "bg-[hsl(var(--badge-flashcard))]/10 text-[hsl(var(--badge-flashcard))] border-[hsl(var(--badge-flashcard))]/20";
    case "review":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const formatDuration = (mins: number | null) => {
  if (!mins) return "";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
};

export function StudyPlannerWidget() {
  const { tasks, loading } = useStudyTasks();
  
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Filter tasks
  const upcomingTasks = tasks.filter(
    (t) => !t.is_completed && t.scheduled_date >= todayStr
  ).slice(0, 4);

  const overdueTasks = tasks.filter(
    (t) => !t.is_completed && t.scheduled_date < todayStr
  );

  const hasNoTasks = tasks.length === 0;

  if (hasNoTasks && !loading) {
    return (
      <div className="bg-card rounded-xl border border-border/50 shadow-xs h-full flex flex-col min-h-[360px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/30">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Study Planner</h3>
            <p className="text-[13px] text-muted-foreground/80 mt-0.5">{formattedDate}</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-primary" strokeWidth={1.75} />
          </div>
          <p className="text-[15px] text-foreground font-medium mb-1">No study plan yet</p>
          <p className="text-[13px] text-muted-foreground/70 mb-5 max-w-[200px]">
            Create a personalized study plan to stay organized
          </p>
          <Button asChild size="sm" className="rounded-lg h-9 px-5 text-[13px] font-medium">
            <Link to="/study-planner/setup">Get Started</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-xs h-full flex flex-col min-h-[360px]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/30">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Study Planner</h3>
          <p className="text-[13px] text-muted-foreground/80 mt-0.5">{formattedDate}</p>
        </div>
        <Link
          to="/study-planner"
          className="flex items-center gap-0.5 text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View Plan
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList className="h-8 bg-muted/40 p-0.5 rounded-lg w-full">
            <TabsTrigger
              value="upcoming"
              className="h-7 flex-1 rounded-md text-[13px] font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground transition-all"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="h-7 flex-1 rounded-md text-[13px] font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground flex items-center justify-center gap-1.5 transition-all"
            >
              Overdue
              {overdueTasks.length > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {overdueTasks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 px-6 py-4">
          <TabsContent value="upcoming" className="mt-0 h-full">
            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-[hsl(var(--badge-success))]/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(var(--badge-success))]" strokeWidth={1.75} />
                </div>
                <p className="text-[14px] font-medium text-foreground">All caught up!</p>
                <p className="text-[12px] text-muted-foreground/70 mt-0.5">No upcoming tasks</p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcomingTasks.map((task) => {
                  const IconComponent = typeIcons[task.task_type] || FileText;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between py-3 group hover:bg-muted/30 -mx-3 px-3 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          task.task_type === "tutorial" && "bg-[hsl(var(--badge-success))]/10",
                          task.task_type === "practice" && "bg-[hsl(var(--badge-practice))]/10",
                          task.task_type === "flashcard" && "bg-[hsl(var(--badge-flashcard))]/10",
                          task.task_type === "review" && "bg-primary/10",
                          !["tutorial", "practice", "flashcard", "review"].includes(task.task_type) && "bg-muted"
                        )}>
                          <IconComponent className={cn(
                            "h-4 w-4",
                            task.task_type === "tutorial" && "text-[hsl(var(--badge-success))]",
                            task.task_type === "practice" && "text-[hsl(var(--badge-practice))]",
                            task.task_type === "flashcard" && "text-[hsl(var(--badge-flashcard))]",
                            task.task_type === "review" && "text-primary",
                            !["tutorial", "practice", "flashcard", "review"].includes(task.task_type) && "text-muted-foreground"
                          )} strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[13px] font-medium text-foreground block truncate">
                            {task.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground/70">
                            {typeLabels[task.task_type] || task.task_type}
                            {task.estimated_duration_minutes && ` • ${formatDuration(task.estimated_duration_minutes)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overdue" className="mt-0 h-full">
            {overdueTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-[hsl(var(--badge-success))]/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(var(--badge-success))]" strokeWidth={1.75} />
                </div>
                <p className="text-[14px] font-medium text-foreground">No overdue tasks!</p>
                <p className="text-[12px] text-muted-foreground/70 mt-0.5">You're on track</p>
              </div>
            ) : (
              <div className="space-y-1">
                {overdueTasks.slice(0, 4).map((task) => {
                  const IconComponent = typeIcons[task.task_type] || FileText;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between py-3 group hover:bg-destructive/5 -mx-3 px-3 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                          <IconComponent className="h-4 w-4 text-destructive" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[13px] font-medium text-foreground block truncate">
                            {task.title}
                          </span>
                          <span className="text-[11px] text-destructive/80">
                            {format(new Date(task.scheduled_date), "MMM d")}
                            {task.estimated_duration_minutes && ` • ${formatDuration(task.estimated_duration_minutes)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
