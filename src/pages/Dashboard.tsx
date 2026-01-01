import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StudyPlannerWidget } from "@/components/dashboard/StudyPlannerWidget";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { FileText, Upload, ListChecks } from "lucide-react";

const Dashboard = () => {
  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <p className="text-muted-foreground text-lg">Welcome</p>

        {/* Stats Cards Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Question Score"
            value="0%"
            subtitle="Correct"
            icon={FileText}
            variant="primary"
          />
          <StatsCard
            title="QBank Usage"
            value="1%"
            subtitle="40 / 3639 Used"
            icon={Upload}
            variant="primary"
          />
          <StatsCard
            title="Test Count"
            value="100%"
            subtitle="1 / 1 Completed"
            icon={ListChecks}
            variant="primary"
          />
        </div>

        {/* Study Planner and Progress Ring Row */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <StudyPlannerWidget />
          </div>
          <div className="lg:col-span-2">
            <ProgressRing
              progress={76.19}
              daysRemaining={10}
              totalDays={10}
              completed={1}
              overdue={0}
              incomplete={3}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;