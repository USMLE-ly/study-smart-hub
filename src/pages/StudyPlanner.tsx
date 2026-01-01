import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MoreVertical, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DayTask {
  id: string;
  title: string;
  type: "tutorial" | "practice" | "flashcard";
  count?: string;
  duration: string;
  completed: boolean;
}

interface DaySchedule {
  dayNumber: number;
  dayName: string;
  totalDuration: string;
  tasks: DayTask[];
  isToday?: boolean;
}

const weekSchedule: DaySchedule[] = [
  {
    dayNumber: 28,
    dayName: "Sunday",
    totalDuration: "16 hrs",
    tasks: [],
  },
  {
    dayNumber: 29,
    dayName: "Monday",
    totalDuration: "16 hrs",
    tasks: [],
  },
  {
    dayNumber: 30,
    dayName: "Tuesday",
    totalDuration: "16 hrs",
    tasks: [],
  },
  {
    dayNumber: 31,
    dayName: "Wednesday",
    totalDuration: "16 hrs",
    tasks: [
      { id: "1", title: "Practice Questions", type: "practice", count: "369 Qs", duration: "12 hrs, 18 mins", completed: false },
      { id: "2", title: "Review Flashcards", type: "flashcard", count: "222 Cards", duration: "3 hrs, 42 mins", completed: false },
    ],
  },
  {
    dayNumber: 1,
    dayName: "Thursday",
    totalDuration: "16 hrs, 07 mins",
    isToday: true,
    tasks: [
      { id: "3", title: "Learn the Basics: How to Use your Study Plan", type: "tutorial", duration: "07 mins", completed: true },
      { id: "4", title: "Practice Questions", type: "practice", count: "369 Qs", duration: "12 hrs, 18 mins", completed: true },
      { id: "5", title: "Review Flashcards", type: "flashcard", count: "222 Cards", duration: "3 hrs, 42 mins", completed: true },
    ],
  },
  {
    dayNumber: 2,
    dayName: "Friday",
    totalDuration: "16 hrs",
    tasks: [
      { id: "6", title: "Practice Questions", type: "practice", count: "369 Qs", duration: "12 hrs, 18 mins", completed: false },
      { id: "7", title: "Review Flashcards", type: "flashcard", count: "222 Cards", duration: "3 hrs, 42 mins", completed: false },
    ],
  },
  {
    dayNumber: 3,
    dayName: "Saturday",
    totalDuration: "16 hrs",
    tasks: [
      { id: "8", title: "Practice Questions", type: "practice", count: "369 Qs", duration: "12 hrs, 18 mins", completed: false },
    ],
  },
];

const badgeVariants: Record<DayTask["type"], "tutorial" | "practice" | "flashcard"> = {
  tutorial: "tutorial",
  practice: "practice",
  flashcard: "flashcard",
};

const typeLabels: Record<DayTask["type"], string> = {
  tutorial: "Tutorial",
  practice: "Practice Questions",
  flashcard: "Review Flashcards",
};

const StudyPlanner = () => {
  const [expandedDays, setExpandedDays] = useState<number[]>([1, 31, 2]);
  const [currentMonth] = useState("January, 2026");

  const toggleDay = (dayNumber: number) => {
    setExpandedDays((prev) =>
      prev.includes(dayNumber)
        ? prev.filter((d) => d !== dayNumber)
        : [...prev, dayNumber]
    );
  };

  return (
    <AppLayout title="Study Planner">
      <div className="space-y-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              Today
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-xl font-semibold text-foreground">{currentMonth}</h2>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive/10">
              Overdue Tasks
              <Badge variant="destructive" className="ml-1">2</Badge>
            </Button>
            <Button variant="outline">
              Week View
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week Schedule */}
        <Card>
          <CardContent className="p-0">
            {weekSchedule.map((day, index) => (
              <div
                key={day.dayNumber}
                className={cn(
                  "border-b border-border last:border-b-0",
                  day.isToday && "bg-primary/5"
                )}
              >
                {/* Day Header */}
                <div
                  className="flex cursor-pointer items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                  onClick={() => day.tasks.length > 0 && toggleDay(day.dayNumber)}
                >
                  <div className="flex items-center gap-4">
                    {day.tasks.length > 0 ? (
                      expandedDays.includes(day.dayNumber) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )
                    ) : (
                      <div className="w-5" />
                    )}
                    <div className="flex items-center gap-3">
                      {day.isToday && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {day.dayNumber}
                        </div>
                      )}
                      {!day.isToday && (
                        <span className="text-lg font-semibold text-foreground w-8 text-center">
                          {day.dayNumber}
                        </span>
                      )}
                      <span className="font-medium text-foreground">{day.dayName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{day.totalDuration}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {/* Day Tasks */}
                {expandedDays.includes(day.dayNumber) && day.tasks.length > 0 && (
                  <div className="border-t border-border bg-card/50">
                    {day.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between px-12 py-3 border-b border-border/50 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          {task.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--badge-success))]" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-destructive" />
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={badgeVariants[task.type]}>
                            {typeLabels[task.type]}
                          </Badge>
                          {task.count && (
                            <span className="text-sm text-muted-foreground">{task.count}</span>
                          )}
                          <span className="text-sm text-muted-foreground">{task.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default StudyPlanner;
