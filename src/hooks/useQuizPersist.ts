import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpacedRepetition } from "@/hooks/useSpacedRepetition";

interface QuizResult {
  quizType: "practice" | "daily_challenge" | "topic_drill";
  topic: string | null;
  totalQuestions: number;
  correctAnswers: number;
  totalXP: number;
  bestStreak: number;
  timedMode: boolean;
  durationSeconds?: number;
  answers: {
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean;
    xpEarned: number;
    timeTakenSeconds?: number;
  }[];
}

export function useQuizPersist() {
  const { user } = useAuth();
  const { addToQueue } = useSpacedRepetition();

  const saveQuizResult = useCallback(async (result: QuizResult) => {
    if (!user) return null;

    // 1. Insert quiz attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        quiz_type: result.quizType,
        topic: result.topic,
        total_questions: result.totalQuestions,
        correct_answers: result.correctAnswers,
        total_xp: result.totalXP,
        best_streak: result.bestStreak,
        timed_mode: result.timedMode,
        duration_seconds: result.durationSeconds ?? null,
      })
      .select("id")
      .single();

    if (attemptErr || !attempt) {
      console.error("Failed to save quiz attempt:", attemptErr);
      return null;
    }

    // 2. Insert individual answers
    if (result.answers.length > 0) {
      const answerRows = result.answers.map((a) => ({
        attempt_id: attempt.id,
        user_id: user.id,
        question_id: a.questionId,
        selected_index: a.selectedIndex,
        is_correct: a.isCorrect,
        xp_earned: a.xpEarned,
        time_taken_seconds: a.timeTakenSeconds ?? null,
      }));

      await supabase.from("quiz_answers").insert(answerRows);
    }

    // 3. Update streaks
    await updateStreaks(user.id, result.totalXP);

    // 4. Add wrong answers to spaced repetition queue
    for (const a of result.answers) {
      if (!a.isCorrect) {
        await addToQueue(a.questionId);
      }
    }

    return attempt.id;
  }, [user, addToQueue]);

  const saveDailyCompletion = useCallback(async (
    attemptId: string | null,
    score: number,
    totalXP: number,
    completionBonus: number
  ) => {
    if (!user) return;

    await supabase.from("daily_completions").insert({
      user_id: user.id,
      attempt_id: attemptId,
      score,
      total_xp: totalXP,
      completion_bonus: completionBonus,
    });
  }, [user]);

  return { saveQuizResult, saveDailyCompletion };
}

async function updateStreaks(userId: string, xpEarned: number) {
  const today = new Date().toISOString().split("T")[0];

  // Get current streak data
  const { data: existing } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!existing) {
    // Create new streak record
    await supabase.from("user_streaks").insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
      total_xp: xpEarned,
    });
    return;
  }

  const lastDate = existing.last_activity_date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = existing.current_streak;

  if (lastDate === today) {
    // Already active today, just add XP
  } else if (lastDate === yesterdayStr) {
    newStreak += 1;
  } else {
    newStreak = 1;
  }

  const longestStreak = Math.max(existing.longest_streak, newStreak);

  await supabase
    .from("user_streaks")
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_activity_date: today,
      total_xp: existing.total_xp + xpEarned,
    })
    .eq("user_id", userId);
}
