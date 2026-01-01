import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  Award, 
  Flame,
  CheckCircle2,
  BookOpen,
  Brain,
  Share2,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { useStudyTasks, StudyTask } from "@/hooks/useStudyTasks";
import { useGamification } from "@/hooks/useGamification";
import { useTests } from "@/hooks/useTests";
import { cn } from "@/lib/utils";

interface DailyStats {
  date: Date;
  tasksCompleted: number;
  totalTasks: number;
  minutesStudied: number;
}

export function WeeklyStudyReport() {
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const reportRef = useRef<HTMLDivElement>(null);
  
  const { tasks } = useStudyTasks();
  const { stats: gamificationStats, userAchievements, achievements } = useGamification();
  const { tests, fetchTests } = useTests();
  
  // Fetch tests on mount
  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: selectedWeekStart, end: weekEnd });

  // Calculate daily stats for the week
  const dailyStats: DailyStats[] = weekDays.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayTasks = tasks.filter(t => t.scheduled_date === dayStr);
    const completedTasks = dayTasks.filter(t => t.is_completed);
    const minutesStudied = completedTasks.reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0);
    
    return {
      date: day,
      tasksCompleted: completedTasks.length,
      totalTasks: dayTasks.length,
      minutesStudied,
    };
  });

  // Weekly aggregates
  const weeklyTasksCompleted = dailyStats.reduce((sum, d) => sum + d.tasksCompleted, 0);
  const weeklyTotalTasks = dailyStats.reduce((sum, d) => sum + d.totalTasks, 0);
  const weeklyMinutesStudied = dailyStats.reduce((sum, d) => sum + d.minutesStudied, 0);
  const completionRate = weeklyTotalTasks > 0 ? Math.round((weeklyTasksCompleted / weeklyTotalTasks) * 100) : 0;
  const maxDailyMinutes = Math.max(...dailyStats.map(d => d.minutesStudied), 60);

  // Best day of the week
  const bestDay = dailyStats.reduce((best, current) => 
    current.minutesStudied > best.minutesStudied ? current : best
  , dailyStats[0]);

  // Streak info
  const currentStreak = gamificationStats?.current_streak || 0;
  const longestStreak = gamificationStats?.longest_streak || 0;

  // Recent achievements (this week)
  const weeklyAchievements = userAchievements.filter(ua => {
    const earnedDate = new Date(ua.earned_at);
    return earnedDate >= selectedWeekStart && earnedDate <= weekEnd;
  });

  // Test performance this week
  const weeklyTests = tests?.filter(t => {
    const testDate = new Date(t.created_at);
    return testDate >= selectedWeekStart && testDate <= weekEnd && t.status === 'completed';
  }) || [];
  
  const avgTestScore = weeklyTests.length > 0 
    ? Math.round(weeklyTests.reduce((sum, t) => sum + (t.score_percentage || 0), 0) / weeklyTests.length)
    : 0;

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedWeekStart(prev => 
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    );
  };

  const formatHoursMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const isCurrentWeek = isSameDay(selectedWeekStart, startOfWeek(new Date(), { weekStartsOn: 0 }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Week Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Weekly Study Report
          </h2>
          <p className="text-muted-foreground mt-1">
            {format(selectedWeekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('prev')}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isCurrentWeek ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
            disabled={isCurrentWeek}
          >
            This Week
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('next')}
            disabled={isCurrentWeek}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Report Card */}
      <div ref={reportRef} className="space-y-6">
        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{weeklyTasksCompleted}</p>
                  <p className="text-xs text-muted-foreground">Tasks Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{formatHoursMinutes(weeklyMinutesStudied)}</p>
                  <p className="text-xs text-muted-foreground">Study Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{currentStreak}</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Activity Chart */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Daily Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-end justify-between gap-2 h-40 pt-4">
              {dailyStats.map((day, index) => {
                const heightPercent = maxDailyMinutes > 0 ? (day.minutesStudied / maxDailyMinutes) * 100 : 0;
                const isToday = isSameDay(day.date, new Date());
                const isBestDay = isSameDay(day.date, bestDay.date) && day.minutesStudied > 0;
                
                return (
                  <div 
                    key={day.date.toISOString()} 
                    className="flex-1 flex flex-col items-center gap-2 group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Time label */}
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.minutesStudied > 0 ? formatHoursMinutes(day.minutesStudied) : '-'}
                    </span>
                    
                    {/* Bar */}
                    <div className="w-full flex justify-center">
                      <div 
                        className={cn(
                          "w-8 rounded-t-lg transition-all duration-500 ease-out relative overflow-hidden",
                          isToday ? "bg-gradient-to-t from-primary to-primary/70" : 
                          isBestDay ? "bg-gradient-to-t from-amber-500 to-amber-400" :
                          "bg-gradient-to-t from-muted-foreground/30 to-muted-foreground/20",
                          "group-hover:scale-105"
                        )}
                        style={{ 
                          height: `${Math.max(heightPercent, 4)}%`,
                          minHeight: '4px'
                        }}
                      >
                        {isBestDay && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                            <Award className="h-3 w-3 text-amber-500" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Day label */}
                    <div className="text-center">
                      <span className={cn(
                        "text-xs font-medium",
                        isToday ? "text-primary" : "text-muted-foreground"
                      )}>
                        {format(day.date, "EEE")}
                      </span>
                      {day.tasksCompleted > 0 && (
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                          <span className="text-[10px] text-muted-foreground">{day.tasksCompleted}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Weekly Progress Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Progress Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Task Completion */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks Completed</span>
                  <span className="font-medium">{weeklyTasksCompleted} / {weeklyTotalTasks}</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>

              {/* Study Hours Goal */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Weekly Study Goal</span>
                  <span className="font-medium">{formatHoursMinutes(weeklyMinutesStudied)} / 20h</span>
                </div>
                <Progress 
                  value={Math.min((weeklyMinutesStudied / (20 * 60)) * 100, 100)} 
                  className="h-2" 
                />
              </div>

              {/* Best Day */}
              {bestDay.minutesStudied > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Best Day</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{format(bestDay.date, "EEEE")}</p>
                    <p className="text-xs text-muted-foreground">{formatHoursMinutes(bestDay.minutesStudied)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements & Tests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Test Performance */}
              {weeklyTests.length > 0 ? (
                <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Tests Completed</span>
                    <Badge variant="secondary">{weeklyTests.length}</Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-blue-500">{avgTestScore}%</span>
                    <span className="text-sm text-muted-foreground">avg score</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">No tests completed this week</p>
                </div>
              )}

              {/* Achievements Earned */}
              <div>
                <p className="text-sm font-medium mb-2">Achievements Earned</p>
                {weeklyAchievements.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {weeklyAchievements.slice(0, 4).map((ua) => {
                      const achievement = achievements.find(a => a.id === ua.achievement_id);
                      return (
                        <Badge 
                          key={ua.id} 
                          variant="outline" 
                          className="bg-gradient-to-r from-purple-500/10 to-violet-500/5 border-purple-500/20"
                        >
                          <Award className="h-3 w-3 mr-1 text-purple-500" />
                          {achievement?.name || "Achievement"}
                        </Badge>
                      );
                    })}
                    {weeklyAchievements.length > 4 && (
                      <Badge variant="outline">+{weeklyAchievements.length - 4} more</Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Keep studying to unlock achievements!</p>
                )}
              </div>

              {/* Streak Info */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Current Streak</p>
                    <p className="text-xs text-muted-foreground">Best: {longestStreak} days</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-orange-500">{currentStreak}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Motivation Quote */}
        <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-medium text-foreground italic">
              "The secret of getting ahead is getting started."
            </p>
            <p className="text-sm text-muted-foreground mt-2">— Mark Twain</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}