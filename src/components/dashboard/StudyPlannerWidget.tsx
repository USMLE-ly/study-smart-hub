import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock } from "lucide-react";
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
    title: "Learn the Basics: How to Use your Study Plan",
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
    completed: false,
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Study Planner</CardTitle>
        <span className="text-sm text-muted-foreground">{today}</span>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upcoming" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="overdue" className="relative">
                Overdue
                {overdueTasks.length > 0 && (
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                    {overdueTasks.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <Button variant="link" asChild className="text-primary">
              <Link to="/study-planner">View Plan</Link>
            </Button>
          </div>

          <TabsContent value="upcoming" className="space-y-3">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2
                    className={`h-5 w-5 ${
                      task.completed ? "text-[hsl(var(--badge-success))]" : "text-muted"
                    }`}
                  />
                  <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={badgeVariants[task.type]}>{typeLabels[task.type]}</Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {task.duration}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-3">
            {overdueTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium text-foreground">{task.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={badgeVariants[task.type]}>{typeLabels[task.type]}</Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {task.duration}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
