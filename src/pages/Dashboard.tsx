import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StudyPlannerWidget } from "@/components/dashboard/StudyPlannerWidget";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { SkeletonCard } from "@/components/ui/LoadingSpinner";
import { Target, TrendingUp, Award } from "lucide-react";
import { useTests } from "@/hooks/useTests";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useStudyTasks } from "@/hooks/useStudyTasks";

const Dashboard = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { tests, loading: testsLoading } = useTests();
  const { stats, loading: tasksLoading } = useStudyTasks();

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

  // Calculate study plan progress from real data
  const studyProgress = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="space-y-6 max-w-7xl">
          <div>
            <div className="h-7 bg-muted/60 rounded-lg w-52 animate-pulse mb-2" />
            <div className="h-4 bg-muted/40 rounded-lg w-72 animate-pulse" />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SkeletonCard className="h-[360px]" />
            </div>
            <div className="lg:col-span-2">
              <SkeletonCard className="h-[360px]" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6 max-w-7xl">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h2 className="text-[22px] font-semibold text-foreground tracking-tight">
            Welcome back, {firstName}
          </h2>
          <p className="text-[14px] text-muted-foreground/80 mt-0.5">
            Track your progress and continue studying
          </p>
        </div>

        {/* Stats Cards Row */}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
            <StatsCard
              title="Question Score"
              value={`${scorePercentage}%`}
              subtitle="Correct answers"
              icon={Target}
              variant="primary"
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <StatsCard
              title="QBank Progress"
              value={`${usagePercentage}%`}
              subtitle={`${usedQuestions.toLocaleString()} of ${totalQBankQuestions.toLocaleString()}`}
              icon={TrendingUp}
              variant="primary"
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
            <StatsCard
              title="Tests Completed"
              value={`${completedTests.length}`}
              subtitle={`${testCompletionPercentage}% completion rate`}
              icon={Award}
              variant="success"
            />
          </div>
        </div>

        {/* Study Planner and Progress Ring Row */}
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <StudyPlannerWidget />
          </div>
          <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '250ms' }}>
            <ProgressRing
              progress={studyProgress}
              daysRemaining={stats.daysRemaining}
              totalDays={14}
              completed={stats.completed}
              overdue={stats.overdue}
              incomplete={stats.upcoming}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
