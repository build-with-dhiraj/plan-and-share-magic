import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DashboardStats {
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  quizzesCompleted: number;
  factsRecalled: number;
  topicCoverage: Record<string, { correct: number; total: number }>;
  activityDays: { date: string; xp: number; completed: boolean }[];
  loading: boolean;
}

export function useDashboardData(): DashboardStats {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalXP: 0,
    currentStreak: 0,
    longestStreak: 0,
    quizzesCompleted: 0,
    factsRecalled: 0,
    topicCoverage: {},
    activityDays: [],
    loading: true,
  });

  const fetchData = useCallback(async () => {
    if (!user) {
      setStats((s) => ({ ...s, loading: false }));
      return;
    }

    try {
      // Fetch all in parallel
      const [streakRes, attemptsRes, answersRes, dailyRes] = await Promise.all([
        supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("quiz_attempts")
          .select("id, completed_at, total_xp, correct_answers, total_questions, topic")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false }),
        supabase
          .from("quiz_answers")
          .select("is_correct, question_id")
          .eq("user_id", user.id),
        supabase
          .from("daily_completions")
          .select("challenge_date, total_xp")
          .eq("user_id", user.id)
          .order("challenge_date", { ascending: true }),
      ]);

      const streak = streakRes.data;
      const attempts = attemptsRes.data || [];
      const answers = answersRes.data || [];
      const dailyCompletions = dailyRes.data || [];

      // Topic coverage from attempts
      const topicCoverage: Record<string, { correct: number; total: number }> = {};
      for (const a of attempts) {
        const t = a.topic || "Mixed";
        if (!topicCoverage[t]) topicCoverage[t] = { correct: 0, total: 0 };
        topicCoverage[t].correct += a.correct_answers;
        topicCoverage[t].total += a.total_questions;
      }

      // Build activity heatmap from daily_completions + quiz_attempts
      const activityMap: Record<string, number> = {};

      for (const d of dailyCompletions) {
        activityMap[d.challenge_date] = (activityMap[d.challenge_date] || 0) + d.total_xp;
      }

      for (const a of attempts) {
        const date = a.completed_at.split("T")[0];
        activityMap[date] = (activityMap[date] || 0) + a.total_xp;
      }

      // Generate 84 days (12 weeks)
      const activityDays: { date: string; xp: number; completed: boolean }[] = [];
      const today = new Date();
      for (let i = 83; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const xp = activityMap[key] || 0;
        activityDays.push({ date: key, xp, completed: xp > 0 });
      }

      setStats({
        totalXP: streak?.total_xp || 0,
        currentStreak: streak?.current_streak || 0,
        longestStreak: streak?.longest_streak || 0,
        quizzesCompleted: attempts.length,
        factsRecalled: answers.filter((a) => a.is_correct).length,
        topicCoverage,
        activityDays,
        loading: false,
      });
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
      setStats((s) => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return stats;
}
