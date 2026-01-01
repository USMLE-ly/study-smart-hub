import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

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

const badgeVariants: Record<StudyTask["type"], "tutorial" | "practice" | "flashcard"> = {
  tutorial: "tutorial",
  practice: "practice",
  flashcard: "flashcard",
};

const typeLabels: Record<StudyTask["type"], string> = {
  tutorial: "Tutorial",
  practice: "Practice Questions",
  flashcard: "Review Flashcards",
};

export function StudyPlannerWidget() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Study Planner</h3>
        <span className="text-sm text-muted-foreground">Today, {today.split(', ').slice(1).join(', ')}</span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-9 bg-muted/50 p-1">
            <TabsTrigger 
              value="upcoming" 
              className="text-sm px-4 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger 
              value="overdue" 
              className="text-sm px-4 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm relative"
            >
              Overdue
              {overdueTasks.length > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-medium text-destructive-foreground">
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

        <TabsContent value="upcoming" className="space-y-2 mt-0">
          {upcomingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: task.completed ? 'hsl(142, 71%, 45%)' : 'hsl(var(--muted-foreground))' }}
                />
                <span className="text-sm font-medium text-foreground">
                  {task.title}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={badgeVariants[task.type]} className="text-xs font-medium">
                  {typeLabels[task.type]}
                </Badge>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {task.duration}
                </span>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-2 mt-0">
          {overdueTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between py-3 border-b border-destructive/20 last:border-0 bg-destructive/5 -mx-5 px-5"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-destructive flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{task.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={badgeVariants[task.type]} className="text-xs font-medium">
                  {typeLabels[task.type]}
                </Badge>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {task.duration}
                </span>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}