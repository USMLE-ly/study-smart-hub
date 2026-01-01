import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Crown, ChevronRight, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  xp_points: number;
  level: number;
  current_streak: number;
  rank: number;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getRankBadge = (level: number) => {
  if (level >= 20) return { label: "Master", color: "bg-purple-500" };
  if (level >= 15) return { label: "Expert", color: "bg-blue-500" };
  if (level >= 10) return { label: "Advanced", color: "bg-green-500" };
  if (level >= 5) return { label: "Intermediate", color: "bg-yellow-500" };
  return { label: "Beginner", color: "bg-gray-500" };
};

export function LeaderboardWidget() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);

      // Fetch top performers
      const { data: gamificationData } = await supabase
        .from("user_gamification")
        .select("user_id, xp_points, level, current_streak")
        .order("xp_points", { ascending: false })
        .limit(10);

      if (gamificationData) {
        // Get profiles for display names
        const userIds = gamificationData.map((g) => g.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        const profileMap = new Map(
          profilesData?.map((p) => [p.user_id, p.full_name || p.email?.split("@")[0] || "Anonymous"])
        );

        const leaderboard = gamificationData.map((entry, index) => ({
          user_id: entry.user_id,
          display_name: profileMap.get(entry.user_id) || "Anonymous",
          xp_points: entry.xp_points,
          level: entry.level,
          current_streak: entry.current_streak,
          rank: index + 1,
        }));

        setEntries(leaderboard);

        // Find current user's rank
        const currentUserEntry = leaderboard.find((e) => e.user_id === user?.id);
        if (currentUserEntry) {
          setUserRank(currentUserEntry);
        }
      }

      setLoading(false);
    };

    fetchLeaderboard();
  }, [user?.id]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-primary" />
            Weekly Leaderboard
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Top 10
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No data yet. Start studying to appear on the leaderboard!
          </p>
        ) : (
          <>
            {entries.slice(0, 5).map((entry) => {
              const isCurrentUser = entry.user_id === user?.id;
              const badge = getRankBadge(entry.level);

              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-colors",
                    isCurrentUser ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                  )}
                >
                  <div className="w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium truncate",
                        isCurrentUser && "text-primary"
                      )}>
                        {entry.display_name}
                        {isCurrentUser && " (You)"}
                      </span>
                      <Badge className={cn("text-[10px] px-1.5 py-0", badge.color)}>
                        Lv.{entry.level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{entry.xp_points.toLocaleString()} XP</span>
                      {entry.current_streak > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Flame className="h-3 w-3 text-orange-500" />
                          {entry.current_streak}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {userRank && userRank.rank > 5 && (
              <>
                <div className="text-center text-muted-foreground text-sm py-1">•••</div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(userRank.rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-primary truncate">
                      {userRank.display_name} (You)
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {userRank.xp_points.toLocaleString()} XP
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}