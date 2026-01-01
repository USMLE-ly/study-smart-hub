import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useStudyTasks } from "@/hooks/useStudyTasks";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

const getBadgeStyles = (type: string) => {
  switch (type) {
    case "tutorial":
      return "bg-[hsl(142,71%,45%)] text-white";
    case "practice":
      return "bg-[hsl(350,80%,65%)] text-white";
    case "flashcard":
      return "bg-[hsl(40,90%,55%)] text-white";
    case "review":
      return "bg-[hsl(142,71%,45%)] text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const typeLabels: Record<string, string> = {
  tutorial: "Tutorial",
  practice: "Practice Questions",
  flashcard: "Review Flashcards",
  review: "Review",
};

const formatDuration = (mins: number | null) => {
  if (!mins) return "";
  if (mins < 60) return `${String(mins).padStart(2, '0')} mins`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours} hrs, ${String(remainingMins).padStart(2, '0')} mins`;
};

export function StudyPlannerWidget() {
  const { tasks, loading } = useStudyTasks();
  
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const formattedDate = `Today, ${format(today, "MMMM d, yyyy")}`;

  // Filter tasks
  const upcomingTasks = tasks.filter(
    (t) => !t.is_completed && t.scheduled_date >= todayStr
  ).slice(0, 5);

  const overdueTasks = tasks.filter(
    (t) => !t.is_completed && t.scheduled_date < todayStr
  );

  const hasNoTasks = tasks.length === 0;

  if (hasNoTasks && !loading) {
    return (
      <div className="bg-card rounded-lg border border-border h-full flex flex-col min-h-[380px]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Study Planner</h3>
          <span className="text-sm text-muted-foreground">{formattedDate}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-primary" strokeWidth={1.75} />
          </div>
          <p className="text-base font-medium text-foreground mb-1">No study plan yet</p>
          <p className="text-sm text-muted-foreground mb-5 max-w-[220px]">
            Create a personalized study plan to stay organized
          </p>
          <Button asChild size="sm" className="rounded-md h-9 px-5">
            <Link to="/study-planner/setup">Get Started</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border h-full flex flex-col min-h-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Study Planner</h3>
        <div className="flex items-center gap-6">
          <span className="text-sm text-muted-foreground">{formattedDate}</span>
          <Link
            to="/study-planner"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View Plan
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="flex-1 flex flex-col">
        <div className="px-5 pt-4 border-b border-border">
          <TabsList className="h-auto bg-transparent p-0 gap-6">
            <TabsTrigger
              value="upcoming"
              className="h-auto pb-3 px-0 rounded-none border-b-2 border-transparent text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="h-auto pb-3 px-0 rounded-none border-b-2 border-transparent text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
            >
              Overdue
              {overdueTasks.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                  {overdueTasks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 px-5 py-4">
          <TabsContent value="upcoming" className="mt-0 h-full">
            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-[hsl(142,71%,45%)]/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(142,71%,45%)]" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-0.5">No upcoming tasks</p>
              </div>
            ) : (
              <div className="space-y-0">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center py-3 border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" strokeWidth={1.5} />
                      <span className="text-sm text-foreground truncate flex-1">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={cn(
                        "px-2.5 py-1 rounded text-xs font-medium",
                        getBadgeStyles(task.task_type)
                      )}>
                        {typeLabels[task.task_type] || task.task_type}
                      </span>
                      {task.estimated_duration_minutes && (
                        <span className="text-sm text-muted-foreground min-w-[90px] text-right">
                          {formatDuration(task.estimated_duration_minutes)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overdue" className="mt-0 h-full">
            {overdueTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-[hsl(142,71%,45%)]/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(142,71%,45%)]" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-foreground">No overdue tasks!</p>
                <p className="text-xs text-muted-foreground mt-0.5">You're on track</p>
              </div>
            ) : (
              <div className="space-y-0">
                {overdueTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center py-3 border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CheckCircle2 className="h-5 w-5 text-destructive shrink-0" strokeWidth={1.5} />
                      <span className="text-sm text-foreground truncate flex-1">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={cn(
                        "px-2.5 py-1 rounded text-xs font-medium",
                        getBadgeStyles(task.task_type)
                      )}>
                        {typeLabels[task.task_type] || task.task_type}
                      </span>
                      <span className="text-sm text-destructive min-w-[90px] text-right">
                        {format(new Date(task.scheduled_date), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
