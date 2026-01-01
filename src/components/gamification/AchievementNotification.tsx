import { useState, useEffect, useCallback } from 'react';
import { Award, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export function AchievementNotification({ achievement, onClose }: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { settings } = useSettings();
  const { playAchievement } = useSoundEffects({ 
    volume: settings.soundVolume, 
    enabled: settings.soundEnabled 
  });

  useEffect(() => {
    if (achievement && settings.achievementPopups) {
      setIsVisible(true);
      playAchievement();
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose, settings.achievementPopups, playAchievement]);

  if (!achievement || !settings.achievementPopups) return null;

  const tierColors: Record<string, string> = {
    bronze: 'from-amber-600 to-amber-800',
    silver: 'from-slate-400 to-slate-600',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-cyan-300 to-cyan-500',
  };

  return (
    <div
      className={cn(
        'fixed top-20 right-4 z-50 max-w-sm',
        'transition-all duration-300 ease-out',
        isVisible 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      )}
    >
      <div className="relative overflow-hidden rounded-xl bg-card border border-border shadow-2xl">
        {/* Animated background gradient */}
        <div className={cn(
          'absolute inset-0 opacity-20 bg-gradient-to-br',
          tierColors[achievement.tier] || tierColors.bronze
        )} />
        
        {/* Sparkle effect */}
        <div className="absolute top-2 right-10 animate-pulse">
          <Sparkles className="h-4 w-4 text-yellow-400" />
        </div>
        <div className="absolute bottom-3 left-8 animate-pulse delay-150">
          <Sparkles className="h-3 w-3 text-yellow-400" />
        </div>
        
        <div className="relative p-4">
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          
          <div className="flex items-start gap-4">
            {/* Achievement icon */}
            <div className={cn(
              'flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center',
              'bg-gradient-to-br shadow-lg',
              tierColors[achievement.tier] || tierColors.bronze
            )}>
              <span className="text-2xl">{achievement.icon}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
                <Award className="h-3 w-3" />
                Achievement Unlocked!
              </p>
              <h4 className="text-base font-bold text-foreground mt-1 truncate">
                {achievement.name}
              </h4>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {achievement.description}
              </p>
            </div>
          </div>
        </div>
        
        {/* Progress bar animation */}
        <div className="h-1 bg-muted">
          <div 
            className={cn(
              'h-full bg-gradient-to-r transition-all duration-[5000ms] ease-linear',
              tierColors[achievement.tier] || tierColors.bronze
            )}
            style={{ width: isVisible ? '0%' : '100%' }}
          />
        </div>
      </div>
    </div>
  );
}

// Hook to manage achievement notifications
export function useAchievementNotification() {
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [queue, setQueue] = useState<Achievement[]>([]);

  const showAchievement = useCallback((achievement: Achievement) => {
    if (currentAchievement) {
      setQueue(prev => [...prev, achievement]);
    } else {
      setCurrentAchievement(achievement);
    }
  }, [currentAchievement]);

  const handleClose = useCallback(() => {
    setCurrentAchievement(null);
    // Show next in queue if any
    setTimeout(() => {
      setQueue(prev => {
        if (prev.length > 0) {
          setCurrentAchievement(prev[0]);
          return prev.slice(1);
        }
        return prev;
      });
    }, 300);
  }, []);

  return {
    currentAchievement,
    showAchievement,
    handleClose,
  };
}
