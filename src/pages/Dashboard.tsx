import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StudyPlannerWidget } from "@/components/dashboard/StudyPlannerWidget";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { SkeletonCard } from "@/components/ui/LoadingSpinner";
import { LeaderboardWidget } from "@/components/gamification/LeaderboardWidget";
import { StreakCelebration, useStreakCelebration } from "@/components/gamification/StreakCelebration";
import { GamificationWidget } from "@/components/gamification/GamificationWidget";
import { FileText, Plus, ClipboardList } from "lucide-react";
import { useTests } from "@/hooks/useTests";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useStudyTasks } from "@/hooks/useStudyTasks";
import { useGamification } from "@/hooks/useGamification";
import { useEffect } from "react";

const Dashboard = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { tests, loading: testsLoading } = useTests();
  const { stats, loading: tasksLoading } = useStudyTasks();
  const { stats: gamificationStats } = useGamification();
  const { celebratingStreak, checkAndCelebrate, closeCelebration } = useStreakCelebration();

  const isLoading = profileLoading || testsLoading;

  // Check for streak milestones
  useEffect(() => {
    if (gamificationStats?.current_streak) {
      checkAndCelebrate(gamificationStats.current_streak);
    }
  }, [gamificationStats?.current_streak, checkAndCelebrate]);

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
    : 100;

  // Calculate study plan progress from real data
  const studyProgress = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="space-y-5 max-w-7xl">
          <div className="h-6 bg-muted/60 rounded w-24 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SkeletonCard className="h-[380px]" />
            </div>
            <div>
              <SkeletonCard className="h-[380px]" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      {/* Streak Celebration Modal */}
      {celebratingStreak && (
        <StreakCelebration streak={celebratingStreak} onClose={closeCelebration} />
      )}

      <div className="space-y-5 max-w-7xl">
        {/* Welcome Text */}
        <p className="text-base text-foreground animate-fade-in">Welcome</p>

        {/* Stats Cards Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
            <StatsCard
              title="Question Score"
              value={`${scorePercentage}%`}
              subtitle="Correct"
              detail={`${totalCorrect} / ${totalQuestions || 0}`}
              icon={FileText}
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <StatsCard
              title="QBank Usage"
              value={`${usagePercentage}%`}
              subtitle={`${usedQuestions} / ${totalQBankQuestions.toLocaleString()} Used`}
              icon={Plus}
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
            <StatsCard
              title="Test Count"
              value={`${testCompletionPercentage}%`}
              subtitle={`${completedTests.length} / ${tests?.length || completedTests.length} Completed`}
              icon={ClipboardList}
            />
          </div>
        </div>

        {/* Study Planner and Progress Ring Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <StudyPlannerWidget />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
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

        {/* Gamification and Leaderboard Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <GamificationWidget />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
            <LeaderboardWidget />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
