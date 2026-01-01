import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StudyPlannerWidget } from "@/components/dashboard/StudyPlannerWidget";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { SkeletonCard } from "@/components/ui/LoadingSpinner";
import { FileText, BarChart3, CheckSquare } from "lucide-react";
import { useTests } from "@/hooks/useTests";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

const Dashboard = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { tests, loading: testsLoading } = useTests();

  const isLoading = profileLoading || testsLoading;

  // Calculate real stats from tests
  const completedTests = tests?.filter(t => t.status === 'completed') || [];
  const totalCorrect = completedTests.reduce((acc, t) => acc + (t.correct_count || 0), 0);
  const totalQuestions = completedTests.reduce((acc, t) => acc + (t.question_count || 0), 0);
  const scorePercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  
  // Assuming 3639 total questions in QBank
  const totalQBankQuestions = 3639;
  const usedQuestions = totalQuestions;
  const usagePercentage = Math.round((usedQuestions / totalQBankQuestions) * 100);
  
  const testCompletionPercentage = tests && tests.length > 0 
    ? Math.round((completedTests.length / tests.length) * 100) 
    : 0;

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Student';

  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="space-y-8 max-w-7xl">
          <div>
            <div className="h-8 bg-muted rounded w-48 animate-pulse mb-2" />
            <div className="h-4 bg-muted rounded w-64 animate-pulse" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SkeletonCard className="h-80" />
            </div>
            <div className="lg:col-span-2">
              <SkeletonCard className="h-80" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h2 className="text-2xl font-semibold text-foreground">Welcome back, {firstName}</h2>
          <p className="text-muted-foreground mt-1">Track your progress and continue studying</p>
        </div>

        {/* Stats Cards Row */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
            <StatsCard
              title="Question Score"
              value={`${scorePercentage}%`}
              subtitle="Correct"
              icon={FileText}
              variant="primary"
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <StatsCard
              title="QBank Usage"
              value={`${usagePercentage}%`}
              subtitle={`${usedQuestions} / ${totalQBankQuestions} Used`}
              icon={BarChart3}
              variant="primary"
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
            <StatsCard
              title="Test Count"
              value={`${testCompletionPercentage}%`}
              subtitle={`${completedTests.length} / ${tests?.length || 0} Completed`}
              icon={CheckSquare}
              variant="success"
            />
          </div>
        </div>

        {/* Study Planner and Progress Ring Row */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <StudyPlannerWidget />
          </div>
          <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '250ms' }}>
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
