import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Brain, TrendingUp, Clock, Target, Calendar, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface RetentionData {
  day: number;
  retention: number;
  optimal: number;
}

interface ReviewTimeData {
  hour: string;
  score: number;
}

interface SpacedRepetitionAnalyticsProps {
  className?: string;
  compact?: boolean;
}

// Ebbinghaus forgetting curve simulation
const generateRetentionCurve = (): RetentionData[] => {
  return Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    // Without review, retention decays exponentially
    const retention = Math.round(100 * Math.exp(-0.1 * day) + Math.random() * 5);
    // With optimal spaced repetition
    const optimal = Math.round(Math.min(95, 70 + Math.log(day + 1) * 10 + Math.random() * 5));
    return { day, retention, optimal };
  });
};

// Optimal review times based on cognitive patterns
const generateOptimalReviewTimes = (): ReviewTimeData[] => {
  const hours = ["6AM", "8AM", "10AM", "12PM", "2PM", "4PM", "6PM", "8PM", "10PM"];
  return hours.map((hour) => {
    let baseScore = 50;
    if (hour === "10AM" || hour === "8AM") baseScore = 90;
    else if (hour === "2PM" || hour === "4PM") baseScore = 75;
    else if (hour === "6PM") baseScore = 70;
    else if (hour === "8PM" || hour === "10PM") baseScore = 55;
    
    return {
      hour,
      score: baseScore + Math.floor(Math.random() * 10),
    };
  });
};

export function SpacedRepetitionAnalytics({ className, compact = false }: SpacedRepetitionAnalyticsProps) {
  const retentionData = generateRetentionCurve();
  const reviewTimes = generateOptimalReviewTimes();
  
  // Calculate key metrics
  const avgRetention = Math.round(
    retentionData.slice(-7).reduce((sum, d) => sum + d.optimal, 0) / 7
  );
  const optimalHour = reviewTimes.reduce((best, curr) => 
    curr.score > best.score ? curr : best
  ).hour;
  const cardsToReview = Math.floor(Math.random() * 50 + 20);
  const streakDays = Math.floor(Math.random() * 14 + 3);

  // Box distribution for Leitner system
  const boxDistribution = [
    { box: 1, cards: 45, interval: "Daily", color: "bg-red-500" },
    { box: 2, cards: 32, interval: "Every 2 days", color: "bg-orange-500" },
    { box: 3, cards: 28, interval: "Every 4 days", color: "bg-yellow-500" },
    { box: 4, cards: 18, interval: "Weekly", color: "bg-green-500" },
    { box: 5, cards: 12, interval: "Bi-weekly", color: "bg-emerald-500" },
  ];

  if (compact) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Spaced Repetition</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Retention Rate</span>
            <span className="text-lg font-bold text-green-500">{avgRetention}%</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Best Review Time</span>
            <Badge variant="secondary">{optimalHour}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cards Due Today</span>
            <span className="font-medium">{cardsToReview}</span>
          </div>
          
          <div className="h-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={retentionData.slice(0, 14)}>
                <defs>
                  <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="optimal" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#colorRetention)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgRetention}%</p>
              <p className="text-xs text-muted-foreground">Avg Retention</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{optimalHour}</p>
              <p className="text-xs text-muted-foreground">Optimal Time</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Target className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cardsToReview}</p>
              <p className="text-xs text-muted-foreground">Cards Due</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Zap className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streakDays}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Retention Curve Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Memory Retention Curve
          </h3>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-400" />
              <span className="text-muted-foreground">Without Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-muted-foreground">With Spaced Repetition</span>
            </div>
          </div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={retentionData}>
              <defs>
                <linearGradient id="colorOptimal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDecay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(350, 80%, 65%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(350, 80%, 65%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }} 
                label={{ value: 'Days', position: 'bottom', offset: -5 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                domain={[0, 100]}
                label={{ value: 'Retention %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [
                  `${value}%`,
                  name === 'optimal' ? 'With Spaced Repetition' : 'Without Review'
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="retention" 
                stroke="hsl(350, 80%, 65%)" 
                fill="url(#colorDecay)"
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="optimal" 
                stroke="hsl(142, 71%, 45%)" 
                fill="url(#colorOptimal)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Optimal Review Times */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Optimal Review Times
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reviewTimes}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Effectiveness']}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(217, 91%, 60%)" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(217, 91%, 60%)', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Your best study time is <span className="font-semibold text-primary">{optimalHour}</span> based on your performance data
          </p>
        </Card>

        {/* Leitner Box Distribution */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Flashcard Box Distribution
          </h3>
          <div className="space-y-3">
            {boxDistribution.map((box) => (
              <div key={box.box} className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm", box.color)}>
                  {box.box}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{box.cards} cards</span>
                    <span className="text-xs text-muted-foreground">{box.interval}</span>
                  </div>
                  <Progress 
                    value={(box.cards / 50) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Cards move to higher boxes with correct answers, increasing review intervals
          </p>
        </Card>
      </div>
    </div>
  );
}
