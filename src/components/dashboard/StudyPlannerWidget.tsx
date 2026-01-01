import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
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
    title: "Learn the Basics: How to Study",
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
    title: "Practice Questions",
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
  practice: "Practice",
  flashcard: "Flashcards",
};

const getBadgeClasses = (type: StudyTask["type"]) => {
  switch (type) {
    case "tutorial":
      return "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/20";
    case "practice":
      return "bg-[hsl(340,75%,55%)]/10 text-[hsl(340,75%,55%)] border-[hsl(340,75%,55%)]/20";
    case "flashcard":
      return "bg-[hsl(45,93%,47%)]/10 text-[hsl(30,80%,40%)] border-[hsl(45,93%,47%)]/20";
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
                    <CheckCircle2
                      className="h-5 w-5 flex-shrink-0 text-[hsl(142,71%,45%)]"
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
                        getBadgeClasses(task.type)
                      )}
                    >
                      {typeLabels[task.type]}
                    </Badge>
                    <span className="text-sm text-muted-foreground w-28 text-right font-medium">
                      {task.duration}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="overdue" className="mt-0 h-full">
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
                        getBadgeClasses(task.type)
                      )}
                    >
                      {typeLabels[task.type]}
                    </Badge>
                    <span className="text-sm text-muted-foreground w-28 text-right font-medium">
                      {task.duration}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
