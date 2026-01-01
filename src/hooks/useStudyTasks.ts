import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays } from "date-fns";

export interface StudyTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  task_type: string;
  scheduled_date: string;
  estimated_duration_minutes: number | null;
  is_completed: boolean | null;
  completed_at: string | null;
  created_at: string;
}

export function useStudyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("study_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_date", { ascending: true });

    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (task: {
    title: string;
    description?: string;
    task_type: string;
    scheduled_date: string;
    estimated_duration_minutes?: number;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("study_tasks")
      .insert({
        user_id: user.id,
        title: task.title,
        description: task.description || null,
        task_type: task.task_type,
        scheduled_date: task.scheduled_date,
        estimated_duration_minutes: task.estimated_duration_minutes || null,
        is_completed: false,
      })
      .select()
      .single();

    if (!error && data) {
      setTasks((prev) => [...prev, data].sort(
        (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
      ));
    }

    return { data, error };
  };

  const updateTask = async (taskId: string, updates: Partial<StudyTask>) => {
    const { error } = await supabase
      .from("study_tasks")
      .update(updates)
      .eq("id", taskId);

    if (!error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
    }

    return { error };
  };

  const toggleComplete = async (taskId: string, completed: boolean) => {
    const updates = {
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    };

    return updateTask(taskId, updates);
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from("study_tasks")
      .delete()
      .eq("id", taskId);

    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }

    return { error };
  };

  // Computed stats
  const today = format(new Date(), "yyyy-MM-dd");
  
  const completedTasks = tasks.filter((t) => t.is_completed).length;
  const overdueTasks = tasks.filter(
    (t) => !t.is_completed && t.scheduled_date < today
  ).length;
  const upcomingTasks = tasks.filter(
    (t) => !t.is_completed && t.scheduled_date >= today
  );

  const totalTimeMinutes = tasks.reduce(
    (sum, t) => sum + (t.estimated_duration_minutes || 0),
    0
  );
  const completedTimeMinutes = tasks
    .filter((t) => t.is_completed)
    .reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0);

  // Calculate days remaining until last scheduled task
  const lastTaskDate = tasks.length > 0
    ? tasks.reduce((latest, t) => {
        const date = new Date(t.scheduled_date);
        return date > latest ? date : latest;
      }, new Date(tasks[0].scheduled_date))
    : new Date();
  
  const daysRemaining = Math.max(0, differenceInDays(lastTaskDate, new Date()) + 1);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    toggleComplete,
    deleteTask,
    fetchTasks,
    stats: {
      total: tasks.length,
      completed: completedTasks,
      overdue: overdueTasks,
      upcoming: upcomingTasks.length,
      totalTimeMinutes,
      completedTimeMinutes,
      daysRemaining,
    },
  };
}
