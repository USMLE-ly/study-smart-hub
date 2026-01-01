import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PerformanceData {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  omittedAnswers: number;
  scorePercentage: number;
  testsCompleted: number;
  totalTimeSeconds: number;
  subjectBreakdown: SubjectPerformance[];
  recentTests: TestPerformance[];
}

export interface SubjectPerformance {
  subject: string;
  correct: number;
  incorrect: number;
  omitted: number;
  total: number;
  percentage: number;
}

export interface TestPerformance {
  id: string;
  name: string;
  date: string;
  score: number;
  questionCount: number;
  timeSpent: number;
}

export function usePerformance() {
  const { user } = useAuth();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPerformanceData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Get all completed tests
    const { data: tests } = await supabase
      .from("tests")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    if (!tests || tests.length === 0) {
      setData({
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        omittedAnswers: 0,
        scorePercentage: 0,
        testsCompleted: 0,
        totalTimeSeconds: 0,
        subjectBreakdown: [],
        recentTests: [],
      });
      setLoading(false);
      return;
    }

    // Aggregate stats
    const totalQuestions = tests.reduce((sum, t) => sum + t.question_count, 0);
    const correctAnswers = tests.reduce((sum, t) => sum + (t.correct_count || 0), 0);
    const incorrectAnswers = tests.reduce((sum, t) => sum + (t.incorrect_count || 0), 0);
    const omittedAnswers = tests.reduce((sum, t) => sum + (t.omitted_count || 0), 0);
    const totalTimeSeconds = tests.reduce((sum, t) => sum + (t.time_spent_seconds || 0), 0);
    const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Get subject breakdown from analytics
    const { data: analytics } = await supabase
      .from("performance_analytics")
      .select("*")
      .eq("user_id", user.id);

    const subjectMap = new Map<string, SubjectPerformance>();
    analytics?.forEach((a) => {
      const existing = subjectMap.get(a.subject) || {
        subject: a.subject,
        correct: 0,
        incorrect: 0,
        omitted: 0,
        total: 0,
        percentage: 0,
      };
      existing.correct += a.questions_correct || 0;
      existing.total += a.questions_attempted || 0;
      existing.incorrect = existing.total - existing.correct;
      existing.percentage = existing.total > 0 ? (existing.correct / existing.total) * 100 : 0;
      subjectMap.set(a.subject, existing);
    });

    // Recent tests
    const recentTests: TestPerformance[] = tests.slice(0, 10).map((t) => ({
      id: t.id,
      name: t.name,
      date: t.completed_at || t.created_at,
      score: t.score_percentage || 0,
      questionCount: t.question_count,
      timeSpent: t.time_spent_seconds || 0,
    }));

    setData({
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      omittedAnswers,
      scorePercentage,
      testsCompleted: tests.length,
      totalTimeSeconds,
      subjectBreakdown: Array.from(subjectMap.values()),
      recentTests,
    });

    setLoading(false);
  }, [user]);

  const recordAnalytics = async (params: {
    subject: string;
    system?: string;
    questionsAttempted: number;
    questionsCorrect: number;
    timeSpentSeconds: number;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const today = new Date().toISOString().split("T")[0];

    // Try to update existing record for today
    const { data: existing } = await supabase
      .from("performance_analytics")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("subject", params.subject)
      .eq("system", params.system || null)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("performance_analytics")
        .update({
          questions_attempted: existing.questions_attempted + params.questionsAttempted,
          questions_correct: existing.questions_correct + params.questionsCorrect,
          time_spent_seconds: existing.time_spent_seconds + params.timeSpentSeconds,
        })
        .eq("id", existing.id);

      return { error };
    } else {
      const { error } = await supabase.from("performance_analytics").insert({
        user_id: user.id,
        date: today,
        subject: params.subject,
        system: params.system,
        questions_attempted: params.questionsAttempted,
        questions_correct: params.questionsCorrect,
        time_spent_seconds: params.timeSpentSeconds,
      });

      return { error };
    }
  };

  return {
    data,
    loading,
    fetchPerformanceData,
    recordAnalytics,
  };
}