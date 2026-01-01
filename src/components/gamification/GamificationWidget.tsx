import { useEffect } from "react";
import { 
  Trophy, 
  Star, 
  Award, 
  Crown, 
  Timer, 
  Zap, 
  Brain, 
  Flame, 
  Target, 
  Medal,
  TrendingUp,
  Rocket,
  Sparkles,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  useGamification, 
  xpProgressInLevel, 
  Achievement 
} from "@/hooks/useGamification";

const iconMap: Record<string, typeof Trophy> = {
  Trophy,
  Star,
  Award,
  Crown,
  Timer,
  Zap,
  Brain,
  Flame,
  Target,
  Medal,
  TrendingUp,
  Rocket,
  Sparkles,
};

const tierColors = {
  bronze: "from-amber-600 to-amber-800",
  silver: "from-slate-400 to-slate-600",
  gold: "from-yellow-400 to-amber-500",
};

const tierBgColors = {
  bronze: "bg-amber-500/10 border-amber-500/30",
  silver: "bg-slate-400/10 border-slate-400/30",
  gold: "bg-yellow-400/10 border-yellow-400/30",
};

interface GamificationWidgetProps {
  compact?: boolean;
}

export function GamificationWidget({ compact = false }: GamificationWidgetProps) {
  const { stats, userAchievements, achievements, loading } = useGamification();

  if (loading || !stats) {
    return (
      <div className="bg-card rounded-lg border border-border p-5 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2 mb-4" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  const xpProgress = xpProgressInLevel(stats.xp_points);
  const earnedIds = userAchievements.map((ua) => ua.achievement_id);

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg border border-purple-500/20 p-4 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
              {stats.level}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Level {stats.level}</p>
              <p className="text-xs text-muted-foreground">{stats.xp_points} XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">{stats.current_streak} day streak</span>
          </div>
        </div>
        <Progress value={xpProgress.percentage} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {xpProgress.current} / {xpProgress.needed} XP to level {stats.level + 1}
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-card rounded-xl border border-border p-5 space-y-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 hover:border-purple-500/20 group">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Header */}
      <div className="relative flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Your Progress</h3>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 transition-all duration-300 hover:bg-orange-500/15 hover:scale-105">
          <Flame className="h-4 w-4 animate-pulse" />
          <span className="text-sm font-medium">{stats.current_streak} day streak</span>
        </div>
      </div>

      {/* Level Progress */}
      <div className="relative space-y-3">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 transition-all duration-300 group-hover:scale-110 group-hover:shadow-purple-500/40">
            {/* Glow ring on hover */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 opacity-0 group-hover:opacity-50 blur-md transition-opacity duration-500" />
            <span className="relative text-2xl font-bold">{stats.level}</span>
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-foreground">Level {stats.level}</p>
            <p className="text-sm text-muted-foreground">{stats.xp_points.toLocaleString()} total XP</p>
          </div>
        </div>
        <div className="space-y-1">
          <Progress value={xpProgress.percentage} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{xpProgress.current} XP</span>
            <span>{xpProgress.needed} XP needed for level {stats.level + 1}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="relative grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-xl bg-muted/50 transition-all duration-300 hover:bg-primary/10 hover:scale-105 hover:-translate-y-0.5 cursor-default group/stat">
          <p className="text-2xl font-bold text-foreground transition-colors duration-200 group-hover/stat:text-primary">{stats.tasks_completed}</p>
          <p className="text-xs text-muted-foreground">Tasks Done</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/50 transition-all duration-300 hover:bg-primary/10 hover:scale-105 hover:-translate-y-0.5 cursor-default group/stat">
          <p className="text-2xl font-bold text-foreground transition-colors duration-200 group-hover/stat:text-primary">{Math.floor(stats.focus_minutes / 60)}h</p>
          <p className="text-xs text-muted-foreground">Focus Time</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/50 transition-all duration-300 hover:bg-primary/10 hover:scale-105 hover:-translate-y-0.5 cursor-default group/stat">
          <p className="text-2xl font-bold text-foreground transition-colors duration-200 group-hover/stat:text-primary">{stats.longest_streak}</p>
          <p className="text-xs text-muted-foreground">Best Streak</p>
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="relative space-y-3">
        <p className="text-sm font-medium text-foreground">
          Achievements ({earnedIds.length}/{achievements.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {achievements.slice(0, 8).map((achievement, index) => {
            const earned = earnedIds.includes(achievement.id);
            const Icon = iconMap[achievement.icon] || Trophy;
            const tier = achievement.tier as keyof typeof tierColors;
            
            return (
              <div
                key={achievement.id}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 animate-fade-in",
                  earned 
                    ? `${tierBgColors[tier]} hover:scale-125 hover:rotate-6 hover:shadow-lg cursor-pointer` 
                    : "bg-muted/30 border-muted opacity-40 hover:opacity-60"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                title={`${achievement.name}: ${achievement.description}`}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-all duration-200",
                  earned ? `bg-gradient-to-r ${tierColors[tier]} bg-clip-text text-transparent` : "text-muted-foreground"
                )} />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Animated bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </div>
  );
}

// Achievement notification popup
export function AchievementNotification({ 
  achievement, 
  onClose 
}: { 
  achievement: Achievement; 
  onClose: () => void;
}) {
  const Icon = iconMap[achievement.icon] || Trophy;
  const tier = achievement.tier as keyof typeof tierColors;

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 right-6 z-50 animate-slide-in-right">
      <div className={cn(
        "p-4 rounded-xl border shadow-xl backdrop-blur-lg",
        tierBgColors[tier],
        "min-w-[280px]"
      )}>
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            `bg-gradient-to-br ${tierColors[tier]}`
          )}>
            <Icon className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Achievement Unlocked!</p>
            <p className="text-lg font-semibold text-foreground">{achievement.name}</p>
            <p className="text-sm text-muted-foreground">{achievement.description}</p>
            <p className="text-xs text-primary mt-1">+{achievement.xp_reward} XP</p>
          </div>
        </div>
      </div>
    </div>
  );
}
