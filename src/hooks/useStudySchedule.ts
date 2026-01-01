import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Json } from "@/integrations/supabase/types";

interface DayConfig {
  day: string;
  shortName: string;
  enabled: boolean;
  hours: number;
}

interface StudySchedule {
  id: string;
  user_id: string;
  start_date: string | null;
  end_date: string | null;
  schedule_data: DayConfig[];
  blocked_dates: string[];
  created_at: string;
  updated_at: string;
}

export function useStudySchedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<StudySchedule | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSchedule = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("study_schedules")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSchedule({
          ...data,
          schedule_data: (data.schedule_data as unknown as DayConfig[]) || [],
          blocked_dates: data.blocked_dates || [],
        });
      }
    } catch (error) {
      console.error("Error fetching study schedule:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const saveSchedule = async (
    scheduleData: DayConfig[],
    startDate?: Date | null,
    endDate?: Date | null,
    blockedDates?: string[]
  ) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const payload = {
        user_id: user.id,
        schedule_data: scheduleData as unknown as Json,
        start_date: startDate ? startDate.toISOString().split("T")[0] : null,
        end_date: endDate ? endDate.toISOString().split("T")[0] : null,
        blocked_dates: blockedDates || schedule?.blocked_dates || [],
      };

      const { data, error } = await supabase
        .from("study_schedules")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;

      setSchedule({
        ...data,
        schedule_data: (data.schedule_data as unknown as DayConfig[]) || [],
        blocked_dates: data.blocked_dates || [],
      });

      return { data, error: null };
    } catch (error) {
      console.error("Error saving study schedule:", error);
      return { error };
    }
  };

  const updateBlockedDates = async (blockedDates: string[]) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const payload = {
        user_id: user.id,
        schedule_data: (schedule?.schedule_data || []) as unknown as Json,
        blocked_dates: blockedDates,
      };

      const { data, error } = await supabase
        .from("study_schedules")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;

      setSchedule({
        ...data,
        schedule_data: (data.schedule_data as unknown as DayConfig[]) || [],
        blocked_dates: data.blocked_dates || [],
      });

      return { data, error: null };
    } catch (error) {
      console.error("Error updating blocked dates:", error);
      return { error };
    }
  };

  return {
    schedule,
    loading,
    saveSchedule,
    updateBlockedDates,
    refetch: fetchSchedule,
  };
}
