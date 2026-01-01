import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Lightbulb, TrendingUp, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AIInsight {
  type: string;
  content: string;
}

interface AIAssistantProps {
  context?: {
    completedTasks?: number;
    pendingTasks?: number;
    currentStreak?: number;
    level?: number;
    xp?: number;
  };
}

export function AIStudyAssistant({ context = {} }: AIAssistantProps) {
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);

  const getInsight = async (type: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("study-assistant", {
        body: { type, context },
      });

      if (error) throw error;
      setInsight({ type, content: data.content });
    } catch (err: any) {
      if (err?.message?.includes("429")) {
        toast.error("Rate limit reached. Try again in a moment.");
      } else {
        toast.error("Failed to get AI insight");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border-purple-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h3 className="font-semibold">AI Study Assistant</h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button size="sm" variant="outline" onClick={() => getInsight("study_tip")} disabled={loading} className="gap-2">
          <Lightbulb className="h-4 w-4" /> Study Tip
        </Button>
        <Button size="sm" variant="outline" onClick={() => getInsight("motivate")} disabled={loading} className="gap-2">
          <Heart className="h-4 w-4" /> Motivate Me
        </Button>
        <Button size="sm" variant="outline" onClick={() => getInsight("analyze_performance")} disabled={loading} className="gap-2">
          <TrendingUp className="h-4 w-4" /> Analyze
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Thinking...</span>
        </div>
      )}

      {insight && !loading && (
        <div className="p-4 rounded-lg bg-card border animate-fade-in">
          <p className="text-sm whitespace-pre-wrap">{insight.content}</p>
        </div>
      )}
    </Card>
  );
}
