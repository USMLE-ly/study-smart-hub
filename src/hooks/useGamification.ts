import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays, isToday, parseISO } from "date-fns";
import { toast } from "sonner";

export interface GamificationStats {
  id: string;
  user_id: string;
  xp_points: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  tasks_completed: number;
  focus_minutes: number;
  last_activity_date: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
  tier: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

// Calculate level from XP (exponential curve)
export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// Calculate XP needed for next level
export function xpForNextLevel(level: number): number {
  return Math.pow(level, 2) * 100;
}

// Calculate current XP progress in level
export function xpProgressInLevel(xp: number): { current: number; needed: number; percentage: number } {
  const level = calculateLevel(xp);
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const xpForNext = xpForNextLevel(level);
  const current = xp - xpForCurrentLevel;
  const needed = xpForNext - xpForCurrentLevel;
  return {
    current,
    needed,
    percentage: Math.min((current / needed) * 100, 100),
  };
}

export function useGamification() {
  const { user } = useAuth();
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch or create gamification stats
      let { data: statsData, error: statsError } = await supabase
        .from("user_gamification")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (statsError && statsError.code === "PGRST116") {
        // No stats exist, create them
        const { data: newStats, error: insertError } = await supabase
          .from("user_gamification")
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (!insertError) {
          statsData = newStats;
        }
      }

      if (statsData) {
        setStats(statsData);
      }

      // Fetch all achievements
      const { data: achievementsData } = await supabase
        .from("achievements")
        .select("*")
        .order("requirement_value", { ascending: true });

      if (achievementsData) {
        setAchievements(achievementsData);
      }

      // Fetch user's earned achievements
      const { data: userAchievementsData } = await supabase
        .from("user_achievements")
        .select("*, achievements(*)")
        .eq("user_id", user.id);

      if (userAchievementsData) {
        setUserAchievements(userAchievementsData as any);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add XP and check for achievements
  const addXP = async (amount: number, reason?: string) => {
    if (!user || !stats) return;

    const newXP = stats.xp_points + amount;
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > stats.level;

    const { error } = await supabase
      .from("user_gamification")
      .update({
        xp_points: newXP,
        level: newLevel,
      })
      .eq("user_id", user.id);

    if (!error) {
      setStats((prev) => prev ? { ...prev, xp_points: newXP, level: newLevel } : null);
      
      if (leveledUp) {
        toast.success(`🎉 Level Up! You're now level ${newLevel}!`, {
          duration: 5000,
        });
      }
      
      // Check for new achievements
      await checkAchievements({ ...stats, xp_points: newXP, level: newLevel });
    }
  };

  // Record task completion
  const recordTaskCompletion = async () => {
    if (!user || !stats) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const lastActivity = stats.last_activity_date;
    
    let newStreak = stats.current_streak;
    
    // Check if this continues or breaks the streak
    if (lastActivity) {
      const lastDate = parseISO(lastActivity);
      const daysDiff = differenceInDays(new Date(), lastDate);
      
      if (daysDiff === 1) {
        // Continuing streak
        newStreak += 1;
      } else if (daysDiff > 1) {
        // Streak broken
        newStreak = 1;
      }
      // If daysDiff === 0, same day, don't change streak
    } else {
      newStreak = 1;
    }

    const newLongestStreak = Math.max(newStreak, stats.longest_streak);
    const newTasksCompleted = stats.tasks_completed + 1;

    const { error } = await supabase
      .from("user_gamification")
      .update({
        tasks_completed: newTasksCompleted,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_activity_date: today,
      })
      .eq("user_id", user.id);

    if (!error) {
      const updatedStats = {
        ...stats,
        tasks_completed: newTasksCompleted,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_activity_date: today,
      };
      setStats(updatedStats);
      
      // Award XP for completing task
      await addXP(25, "Task completed");
      
      // Check achievements
      await checkAchievements(updatedStats);
    }
  };

  // Record focus time
  const recordFocusTime = async (minutes: number) => {
    if (!user || !stats) return;

    const newFocusMinutes = stats.focus_minutes + minutes;

    const { error } = await supabase
      .from("user_gamification")
      .update({ focus_minutes: newFocusMinutes })
      .eq("user_id", user.id);

    if (!error) {
      const updatedStats = { ...stats, focus_minutes: newFocusMinutes };
      setStats(updatedStats);
      
      // Award XP for focus time (1 XP per minute)
      await addXP(minutes, "Focus session");
      
      // Check achievements
      await checkAchievements(updatedStats);
    }
  };

  // Check and award achievements
  const checkAchievements = async (currentStats: GamificationStats) => {
    if (!user) return;

    const earnedIds = userAchievements.map((ua) => ua.achievement_id);
    const newlyEarned: Achievement[] = [];

    for (const achievement of achievements) {
      if (earnedIds.includes(achievement.id)) continue;

      let earned = false;
      const value = achievement.requirement_value;

      switch (achievement.requirement_type) {
        case "tasks_completed":
          earned = currentStats.tasks_completed >= value;
          break;
        case "focus_minutes":
          earned = currentStats.focus_minutes >= value;
          break;
        case "current_streak":
          earned = currentStats.current_streak >= value;
          break;
        case "level":
          earned = currentStats.level >= value;
          break;
      }

      if (earned) {
        const { error } = await supabase
          .from("user_achievements")
          .insert({
            user_id: user.id,
            achievement_id: achievement.id,
          });

        if (!error) {
          newlyEarned.push(achievement);
          // Award achievement XP
          await addXP(achievement.xp_reward, `Achievement: ${achievement.name}`);
        }
      }
    }

    if (newlyEarned.length > 0) {
      setNewAchievements(newlyEarned);
      setUserAchievements((prev) => [
        ...prev,
        ...newlyEarned.map((a) => ({
          id: crypto.randomUUID(),
          user_id: user.id,
          achievement_id: a.id,
          earned_at: new Date().toISOString(),
          achievement: a,
        })),
      ]);
    }
  };

  const clearNewAchievements = () => {
    setNewAchievements([]);
  };

  return {
    stats,
    achievements,
    userAchievements,
    loading,
    newAchievements,
    addXP,
    recordTaskCompletion,
    recordFocusTime,
    clearNewAchievements,
    refetch: fetchData,
  };
}
