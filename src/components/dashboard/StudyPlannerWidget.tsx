import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StudyTask {
  id: string;
  title: string;
  type: "tutorial" | "practice" | "flashcard";
  duration: string;
  completed: boolean;
}

const upcomingTasks: StudyTask[] = [
  {
    id: "1",
    title: "Learn the Basics: Ho...",
    type: "tutorial",
    duration: "07 mins",
    completed: true,
  },
  {
    id: "2",
    title: "Review Flashcards",
    type: "flashcard",
    duration: "3 hrs, 42 mins",
    completed: true,
  },
  {
    id: "3",
    title: "Practice Questio...",
    type: "practice",
    duration: "12 hrs, 18 mins",
    completed: true,
  },
];

const overdueTasks: StudyTask[] = [
  {
    id: "4",
    title: "Biochemistry Review",
    type: "practice",
    duration: "2 hrs, 30 mins",
    completed: false,
  },
  {
    id: "5",
    title: "Anatomy Flashcards",
    type: "flashcard",
    duration: "1 hr, 15 mins",
    completed: false,
  },
];

const typeLabels: Record<StudyTask["type"], string> = {
  tutorial: "Tutorial",
  practice: "Practice Questions",
  flashcard: "Review Flashcards",
};

const getBadgeClasses = (type: StudyTask["type"]) => {
  switch (type) {
    case "tutorial":
      return "bg-[hsl(var(--badge-tutorial))] text-[hsl(var(--badge-tutorial-foreground))] hover:bg-[hsl(var(--badge-tutorial))]/90";
    case "practice":
      return "bg-[hsl(var(--badge-practice))] text-[hsl(var(--badge-practice-foreground))] hover:bg-[hsl(var(--badge-practice))]/90";
    case "flashcard":
      return "bg-[hsl(var(--badge-flashcard))] text-[hsl(var(--badge-flashcard-foreground))] hover:bg-[hsl(var(--badge-flashcard))]/90";
    default:
      return "";
  }
};

export function StudyPlannerWidget() {
  const today = new Date();
  const formattedDate = `Today, ${today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-foreground">Study Planner</h3>
        <span className="text-sm text-muted-foreground">{formattedDate}</span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <div className="flex items-center justify-between mb-5">
          <TabsList className="h-10 bg-transparent p-0 gap-0">
            <TabsTrigger
              value="upcoming"
              className="h-10 px-5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-muted-foreground font-medium"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="h-10 px-5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-muted-foreground font-medium flex items-center gap-2"
            >
              Overdue
              {overdueTasks.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                  {overdueTasks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <Link
            to="/study-planner"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View Plan
          </Link>
        </div>

        <div className="border-t border-border -mx-6 px-6 pt-1">
          <TabsContent value="upcoming" className="mt-0 space-y-0">
            {upcomingTasks.map((task, index) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center justify-between py-4",
                  index < upcomingTasks.length - 1 && "border-b border-border/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2
                    className="h-5 w-5 flex-shrink-0 text-[hsl(var(--badge-success))]"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={cn("text-xs font-medium px-3 py-1", getBadgeClasses(task.type))}>
                    {typeLabels[task.type]}
                  </Badge>
                  <span className="text-sm text-muted-foreground w-24 text-right">
                    {task.duration}
                  </span>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="overdue" className="mt-0 space-y-0">
            {overdueTasks.map((task, index) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center justify-between py-4",
                  index < overdueTasks.length - 1 && "border-b border-border/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Circle className="h-5 w-5 flex-shrink-0 text-destructive" />
                  <span className="text-sm font-medium text-foreground">
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={cn("text-xs font-medium px-3 py-1", getBadgeClasses(task.type))}>
                    {typeLabels[task.type]}
                  </Badge>
                  <span className="text-sm text-muted-foreground w-24 text-right">
                    {task.duration}
                  </span>
                </div>
              </div>
            ))}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}