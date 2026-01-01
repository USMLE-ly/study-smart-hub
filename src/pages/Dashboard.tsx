import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StudyPlannerWidget } from "@/components/dashboard/StudyPlannerWidget";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, BookOpen, CheckSquare, Play, Zap, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-muted-foreground">Welcome</h2>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/flashcards" className="gap-2">
                <Zap className="h-4 w-4" />
                Flashcards
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/qbank/create" className="gap-2">
                <Play className="h-4 w-4" />
                Start Test
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Question Score"
            value="0%"
            subtitle="Correct"
            icon={FileText}
            accentColor="primary"
          />
          <StatsCard
            title="QBank Usage"
            value="1%"
            subtitle="40 / 3639 Used"
            icon={BookOpen}
            accentColor="secondary"
          />
          <StatsCard
            title="Test Count"
            value="100%"
            subtitle="1 / 1 Completed"
            icon={CheckSquare}
            accentColor="success"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/qbank/create">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Create New Test</h3>
                  <p className="text-sm text-muted-foreground">Practice with custom questions</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/flashcards">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[hsl(var(--badge-flashcard))]">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="rounded-lg bg-[hsl(var(--badge-flashcard))]/10 p-3">
                  <Zap className="h-6 w-6 text-[hsl(var(--badge-flashcard))]" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Study Flashcards</h3>
                  <p className="text-sm text-muted-foreground">Review with spaced repetition</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/library">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[hsl(var(--badge-success))]">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="rounded-lg bg-[hsl(var(--badge-success))]/10 p-3">
                  <BookOpen className="h-6 w-6 text-[hsl(var(--badge-success))]" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Medical Library</h3>
                  <p className="text-sm text-muted-foreground">Browse study materials</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
