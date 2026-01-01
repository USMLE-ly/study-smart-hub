import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, ChevronRight, Plus } from "lucide-react";
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

const getBadgeClasses = (type: string) => {
  switch (type) {
    case "tutorial":
      return "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/20";
    case "practice":
      return "bg-[hsl(340,75%,55%)]/10 text-[hsl(340,75%,55%)] border-[hsl(340,75%,55%)]/20";
    case "flashcard":
      return "bg-[hsl(45,93%,47%)]/10 text-[hsl(30,80%,40%)] border-[hsl(45,93%,47%)]/20";
    case "review":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "";
  }
};

const formatDuration = (mins: number | null) => {
  if (!mins) return "";
  if (mins < 60) return `${mins} mins`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${hours}h ${remainingMins}m`;
};

export function StudyPlannerWidget() {
  const { tasks, loading } = useStudyTasks();
  
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const formattedDate = `Today, ${today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;

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
      <div className="bg-card rounded-lg border border-border/60 shadow-sm h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
          <div>
            <h3 className="text-base font-semibold text-foreground">Study Planner</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-2">No study plan yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create a study plan to organize your learning
          </p>
          <Button asChild>
            <Link to="/study-planner/setup">Get Started</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border/60 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
        <div>
          <h3 className="text-base font-semibold text-foreground">Study Planner</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>
        <Link
          to="/study-planner"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View Plan
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList className="h-9 bg-muted/30 p-1 rounded-lg">
            <TabsTrigger
              value="upcoming"
              className="h-7 px-4 rounded-md text-sm font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="h-7 px-4 rounded-md text-sm font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground flex items-center gap-2"
            >
              Overdue
              {overdueTasks.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
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
                <CheckCircle2 className="h-10 w-10 text-[hsl(142,71%,45%)] mb-3" />
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">No upcoming tasks</p>
              </div>
            ) : (
              <div className="space-y-0">
                {upcomingTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between py-4 group hover:bg-muted/20 -mx-2 px-2 rounded-md transition-colors",
                      index < upcomingTasks.length - 1 && "border-b border-border/30"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Circle
                        className="h-5 w-5 flex-shrink-0 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                      <span className="text-sm font-medium text-foreground truncate">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium px-2.5 py-0.5 border rounded-full",
                          getBadgeClasses(task.task_type)
                        )}
                      >
                        {typeLabels[task.task_type] || task.task_type}
                      </Badge>
                      {task.estimated_duration_minutes && (
                        <span className="text-sm text-muted-foreground w-20 text-right font-medium">
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-[hsl(142,71%,45%)] mb-3" />
                <p className="text-sm font-medium text-foreground">No overdue tasks!</p>
                <p className="text-xs text-muted-foreground mt-1">You're on track</p>
              </div>
            ) : (
              <div className="space-y-0">
                {overdueTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between py-4 group hover:bg-muted/20 -mx-2 px-2 rounded-md transition-colors",
                      index < overdueTasks.length - 1 && "border-b border-border/30"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Circle
                        className="h-5 w-5 flex-shrink-0 text-destructive"
                        strokeWidth={1.5}
                      />
                      <span className="text-sm font-medium text-foreground truncate">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium px-2.5 py-0.5 border rounded-full",
                          getBadgeClasses(task.task_type)
                        )}
                      >
                        {typeLabels[task.task_type] || task.task_type}
                      </Badge>
                      {task.estimated_duration_minutes && (
                        <span className="text-sm text-muted-foreground w-20 text-right font-medium">
                          {formatDuration(task.estimated_duration_minutes)}
                        </span>
                      )}
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
