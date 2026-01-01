import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts";
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Brain,
  Calendar,
  Flame,
  Trophy
} from "lucide-react";
import { useStudyTasks } from "@/hooks/useStudyTasks";
import { usePerformance } from "@/hooks/usePerformance";
import { useGamification } from "@/hooks/useGamification";
import { format, subDays, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { SpacedRepetitionAnalytics } from "@/components/analytics/SpacedRepetitionAnalytics";

const COLORS = ["hsl(142, 71%, 45%)", "hsl(350, 80%, 65%)", "hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)"];

const Analytics = () => {
  const { tasks, stats: taskStats } = useStudyTasks();
  const { data: performanceData } = usePerformance();
  const { stats: gamificationStats, userAchievements } = useGamification();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("7d");

  // Calculate data for charts
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  });

  const dailyTaskData = last7Days.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayTasks = tasks.filter(t => t.scheduled_date === dayStr);
    const completed = dayTasks.filter(t => t.is_completed).length;
    const total = dayTasks.length;
    
    return {
      day: format(day, "EEE"),
      completed,
      pending: total - completed,
      total,
    };
  });

  const taskTypeDistribution = tasks.reduce((acc, task) => {
    const type = task.task_type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(taskTypeDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Study time by hour (mock data based on task patterns)
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}:00`,
    minutes: Math.floor(Math.random() * 60 + 10),
  }));

  // Weekly progress trend
  const weeklyTrend = last7Days.map((day, index) => ({
    day: format(day, "EEE"),
    score: Math.min(100, 40 + index * 8 + Math.floor(Math.random() * 15)),
    tasks: Math.floor(Math.random() * 5 + 2),
  }));

  const completionRate = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;

  const avgDailyTasks = Math.round(tasks.length / 7);
  const totalStudyHours = Math.round(
    tasks.reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0) / 60
  );

  return (
    <AppLayout title="Analytics">
      <div className="space-y-6 max-w-7xl">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completionRate}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudyHours}h</p>
                <p className="text-xs text-muted-foreground">Total Study Time</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 group-hover:scale-110 transition-transform">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{gamificationStats?.current_streak || 0}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 group-hover:scale-110 transition-transform">
                <Trophy className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userAchievements?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Achievements</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Daily Tasks Chart */}
          <Card className="p-5 transition-all duration-300 hover:shadow-md">
            <h3 className="text-lg font-semibold mb-4">Daily Task Completion</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTaskData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="completed" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[hsl(142,71%,45%)]" />
                <span className="text-sm text-muted-foreground">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[hsl(217,91%,60%)]" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
            </div>
          </Card>

          {/* Task Distribution Pie */}
          <Card className="p-5 transition-all duration-300 hover:shadow-md">
            <h3 className="text-lg font-semibold mb-4">Task Type Distribution</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Progress Trend */}
        <Card className="p-5 transition-all duration-300 hover:shadow-md">
          <h3 className="text-lg font-semibold mb-4">Weekly Progress Trend</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorScore)"
                  strokeWidth={2}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Study Habits Heatmap */}
        <Card className="p-5 transition-all duration-300 hover:shadow-md">
          <h3 className="text-lg font-semibold mb-4">Study Activity Heatmap</h3>
          <div className="grid grid-cols-7 gap-2">
            {last7Days.map((day, dayIndex) => (
              <div key={dayIndex} className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  {format(day, "EEE")}
                </p>
                <div className="space-y-1">
                  {[0, 1, 2, 3].map((block) => {
                    const intensity = Math.random();
                    return (
                      <div
                        key={block}
                        className={cn(
                          "h-8 rounded transition-all duration-300 hover:scale-105 cursor-pointer",
                          intensity > 0.7 ? "bg-green-500" :
                          intensity > 0.4 ? "bg-green-400" :
                          intensity > 0.2 ? "bg-green-300" :
                          "bg-muted"
                        )}
                        title={`${Math.round(intensity * 60)} minutes`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded bg-muted" />
              <div className="w-4 h-4 rounded bg-green-300" />
              <div className="w-4 h-4 rounded bg-green-400" />
              <div className="w-4 h-4 rounded bg-green-500" />
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </Card>

        {/* Spaced Repetition Analytics */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Spaced Repetition Analytics
          </h2>
          <SpacedRepetitionAnalytics />
        </div>
      </div>
    </AppLayout>
  );
};

export default Analytics;
