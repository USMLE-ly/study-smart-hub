import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StudyPlannerWidget } from "@/components/dashboard/StudyPlannerWidget";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { FileText, BookOpen, CheckSquare } from "lucide-react";

const Dashboard = () => {
  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-lg font-medium text-muted-foreground">Welcome</h2>
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

        {/* Study Planner and Progress */}
        <div className="grid gap-6 lg:grid-cols-2">
          <StudyPlannerWidget />
          <ProgressRing
            progress={76.19}
            daysRemaining={10}
            totalDays={10}
            completed={1}
            overdue={1}
            incomplete={3}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
