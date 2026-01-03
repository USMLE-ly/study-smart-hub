import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Test {
  id: string;
  user_id: string;
  name: string;
  mode: string;
  timer_type: string;
  time_limit_seconds: number | null;
  question_count: number;
  subjects: string[];
  systems: string[];
  status: string;
  score_percentage: number | null;
  correct_count: number | null;
  incorrect_count: number | null;
  omitted_count: number | null;
  time_spent_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface TestAnswer {
  id: string;
  test_id: string;
  question_id: string;
  question_order: number;
  selected_option_id: string | null;
  is_correct: boolean | null;
  is_marked: boolean | null;
  time_spent_seconds: number | null;
  answered_at: string | null;
}

export interface Question {
  id: string;
  question_text: string;
  explanation: string | null;
  question_image_url: string | null;
  explanation_image_url: string | null;
  subject: string;
  system: string;
  difficulty: string | null;
  options?: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_letter: string;
  option_text: string;
  is_correct: boolean;
  explanation: string | null;
}

export function useTests() {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTests = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTests(data);
    }
    setLoading(false);
  }, [user]);

  const createTest = async (params: {
    name: string;
    mode: "tutor" | "timed";
    timerType: "question" | "block";
    timeLimitSeconds?: number;
    questionCount: number;
    subjects: string[];
    systems: string[];
  }) => {
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("tests")
      .insert({
        user_id: user.id,
        name: params.name,
        mode: params.mode,
        timer_type: params.timerType,
        time_limit_seconds: params.timeLimitSeconds,
        question_count: params.questionCount,
        subjects: params.subjects,
        systems: params.systems,
        status: "in_progress",
      })
      .select()
      .single();

    if (!error && data) {
      setTests((prev) => [data, ...prev]);
    }

    return { data, error };
  };

  const getTest = async (testId: string) => {
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .eq("id", testId)
      .single();

    return { data, error };
  };

  const getTestAnswers = async (testId: string) => {
    const { data, error } = await supabase
      .from("test_answers")
      .select("*")
      .eq("test_id", testId)
      .order("question_order", { ascending: true });

    return { data, error };
  };

  const submitAnswer = async (params: {
    testId: string;
    questionId: string;
    questionOrder: number;
    selectedOptionId: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
  }) => {
    const { data: existing } = await supabase
      .from("test_answers")
      .select("id")
      .eq("test_id", params.testId)
      .eq("question_id", params.questionId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("test_answers")
        .update({
          selected_option_id: params.selectedOptionId,
          is_correct: params.isCorrect,
          time_spent_seconds: params.timeSpentSeconds,
          answered_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return { error };
    } else {
      const { error } = await supabase.from("test_answers").insert({
        test_id: params.testId,
        question_id: params.questionId,
        question_order: params.questionOrder,
        selected_option_id: params.selectedOptionId,
        is_correct: params.isCorrect,
        time_spent_seconds: params.timeSpentSeconds,
        answered_at: new Date().toISOString(),
      });

      return { error };
    }
  };

  const markQuestion = async (testId: string, questionId: string, isMarked: boolean) => {
    const { error } = await supabase
      .from("test_answers")
      .update({ is_marked: isMarked })
      .eq("test_id", testId)
      .eq("question_id", questionId);

    return { error };
  };

  const completeTest = async (testId: string) => {
    // Get all answers for this test
    const { data: answers } = await supabase
      .from("test_answers")
      .select("*")
      .eq("test_id", testId);

    if (!answers) return { error: new Error("No answers found") };

    const correctCount = answers.filter((a) => a.is_correct).length;
    const incorrectCount = answers.filter((a) => a.is_correct === false).length;
    const omittedCount = answers.filter((a) => a.selected_option_id === null).length;
    const totalTime = answers.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
    const scorePercentage = answers.length > 0 ? (correctCount / answers.length) * 100 : 0;

    const { error } = await supabase
      .from("tests")
      .update({
        status: "completed",
        score_percentage: scorePercentage,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        omitted_count: omittedCount,
        time_spent_seconds: totalTime,
        completed_at: new Date().toISOString(),
      })
      .eq("id", testId);

    return { error };
  };

  return {
    tests,
    loading,
    fetchTests,
    createTest,
    getTest,
    getTestAnswers,
    submitAnswer,
    markQuestion,
    completeTest,
  };
}