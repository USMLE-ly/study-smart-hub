import { useEffect, useState, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';
import { useStudyTasks } from './useStudyTasks';
import { useGamification } from './useGamification';
import { useTests } from './useTests';

interface WeeklySummary {
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  minutesStudied: number;
  testsCompleted: number;
  avgTestScore: number;
  currentStreak: number;
  achievementsEarned: number;
  weekLabel: string;
}

export function useWeeklyNotification() {
  const [showNotification, setShowNotification] = useState(false);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const { tasks } = useStudyTasks();
  const { stats: gamificationStats, userAchievements } = useGamification();
  const { tests } = useTests();

  const calculateWeeklySummary = useCallback((): WeeklySummary => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
    const weekLabel = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`;

    // Calculate tasks for this week
    const weekTasks = tasks.filter(t => {
      const taskDate = new Date(t.scheduled_date);
      return taskDate >= weekStart && taskDate <= weekEnd;
    });
    const completedTasks = weekTasks.filter(t => t.is_completed);
    const tasksCompleted = completedTasks.length;
    const totalTasks = weekTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;
    const minutesStudied = completedTasks.reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0);

    // Calculate tests for this week
    const weekTests = tests?.filter(t => {
      const testDate = new Date(t.created_at);
      return testDate >= weekStart && testDate <= weekEnd && t.status === 'completed';
    }) || [];
    const testsCompleted = weekTests.length;
    const avgTestScore = testsCompleted > 0 
      ? Math.round(weekTests.reduce((sum, t) => sum + (t.score_percentage || 0), 0) / testsCompleted)
      : 0;

    // Achievements earned this week
    const weekAchievements = userAchievements.filter(ua => {
      const earnedDate = new Date(ua.earned_at);
      return earnedDate >= weekStart && earnedDate <= weekEnd;
    });

    return {
      tasksCompleted,
      totalTasks,
      completionRate,
      minutesStudied,
      testsCompleted,
      avgTestScore,
      currentStreak: gamificationStats?.current_streak || 0,
      achievementsEarned: weekAchievements.length,
      weekLabel,
    };
  }, [tasks, tests, gamificationStats, userAchievements]);

  // Check if we should show the notification (e.g., once per session on Sunday or when triggered)
  const triggerWeeklyNotification = useCallback(() => {
    const summary = calculateWeeklySummary();
    setSummary(summary);
    setShowNotification(true);
  }, [calculateWeeklySummary]);

  const dismissNotification = useCallback(() => {
    setShowNotification(false);
  }, []);

  // Auto-check on Sundays (optional - can be triggered manually)
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const hour = today.getHours();
    
    // Show on Sunday evening (after 5 PM) if not already shown this session
    const sessionKey = `weekly_notification_shown_${format(today, 'yyyy-ww')}`;
    const alreadyShown = sessionStorage.getItem(sessionKey);
    
    if (dayOfWeek === 0 && hour >= 17 && !alreadyShown && tasks.length > 0) {
      triggerWeeklyNotification();
      sessionStorage.setItem(sessionKey, 'true');
    }
  }, [tasks.length, triggerWeeklyNotification]);

  return {
    showNotification,
    summary,
    triggerWeeklyNotification,
    dismissNotification,
  };
}
