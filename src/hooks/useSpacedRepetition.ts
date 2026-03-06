import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { MCQ } from "@/data/sampleMCQs";

// SM-2 Algorithm constants
const MIN_EASE = 1.3;
const INITIAL_EASE = 2.5;
const INITIAL_INTERVAL = 1;

interface SpacedCard {
  id: string;
  question_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
  last_reviewed_at: string | null;
}

interface ReviewStats {
  dueToday: number;
  reviewedToday: number;
  mastered: number; // interval >= 21 days
  loading: boolean;
}

export function useSpacedRepetition() {
  const { user } = useAuth();
  const [dueCards, setDueCards] = useState<(SpacedCard & { mcq: MCQ })[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    dueToday: 0,
    reviewedToday: 0,
    mastered: 0,
    loading: true,
  });

  const fetchDueCards = useCallback(async () => {
    if (!user) {
      setStats((s) => ({ ...s, loading: false }));
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00`;

    // Fetch all cards for stats + due cards
    const [allCardsRes, dueRes] = await Promise.all([
      supabase
        .from("spaced_cards")
        .select("*")
        .eq("user_id", user.id),
      supabase
        .from("spaced_cards")
        .select("*")
        .eq("user_id", user.id)
        .lte("next_review", new Date().toISOString())
        .order("next_review", { ascending: true })
        .limit(20),
    ]);

    const allCards = allCardsRes.data || [];
    const due = dueRes.data || [];

    // Calculate stats
    const reviewedToday = allCards.filter(
      (c) => c.last_reviewed_at && c.last_reviewed_at >= todayStart
    ).length;
    const mastered = allCards.filter((c) => c.interval_days >= 21).length;

    setStats({
      dueToday: due.length,
      reviewedToday,
      mastered,
      loading: false,
    });

    // Fetch MCQ data for due cards
    if (due.length > 0) {
      const questionIds = due.map((c) => c.question_id);

      // Try mcq_bank first
      const { data: mcqs } = await supabase
        .from("mcq_bank")
        .select("*")
        .in("id", questionIds);

      const mcqMap = new Map<string, MCQ>();
      for (const row of mcqs || []) {
        mcqMap.set(row.id, {
          id: row.id,
          question: row.question,
          statements: row.statements || undefined,
          options: row.options,
          correctIndex: row.correct_index,
          explanation: row.explanation,
          topic: row.topic,
          difficulty: row.difficulty as MCQ["difficulty"],
          source: row.source || undefined,
          timeLimit: row.time_limit || 60,
        });
      }

      const enriched = due
        .filter((c) => mcqMap.has(c.question_id))
        .map((c) => ({ ...c, mcq: mcqMap.get(c.question_id)! }));

      setDueCards(enriched);
    } else {
      setDueCards([]);
    }
  }, [user]);

  useEffect(() => {
    fetchDueCards();
  }, [fetchDueCards]);

  /**
   * SM-2 review: quality 0-5
   * 0-2 = forgot (reset), 3 = hard, 4 = good, 5 = easy
   */
  const reviewCard = useCallback(
    async (cardId: string, quality: number) => {
      if (!user) return;

      const card = dueCards.find((c) => c.id === cardId);
      if (!card) return;

      let { ease_factor, interval_days, repetitions } = card;
      const now = new Date().toISOString();

      if (quality < 3) {
        // Reset — failed recall
        repetitions = 0;
        interval_days = INITIAL_INTERVAL;
      } else {
        repetitions += 1;
        if (repetitions === 1) {
          interval_days = 1;
        } else if (repetitions === 2) {
          interval_days = 6;
        } else {
          interval_days = Math.round(interval_days * ease_factor);
        }
      }

      // Update ease factor
      ease_factor =
        ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (ease_factor < MIN_EASE) ease_factor = MIN_EASE;

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval_days);

      await supabase
        .from("spaced_cards")
        .update({
          ease_factor,
          interval_days,
          repetitions,
          next_review: nextReview.toISOString(),
          last_reviewed_at: now,
        })
        .eq("id", cardId);

      // Remove from due list
      setDueCards((prev) => prev.filter((c) => c.id !== cardId));
      setStats((prev) => ({
        ...prev,
        dueToday: prev.dueToday - 1,
        reviewedToday: prev.reviewedToday + 1,
        mastered: interval_days >= 21 ? prev.mastered + 1 : prev.mastered,
      }));
    },
    [user, dueCards]
  );

  /**
   * Add a question to the spaced repetition queue
   * (called after a wrong answer in practice)
   */
  const addToQueue = useCallback(
    async (questionId: string) => {
      if (!user) return;

      // Check if already exists
      const { data: existing } = await supabase
        .from("spaced_cards")
        .select("id")
        .eq("user_id", user.id)
        .eq("question_id", questionId)
        .maybeSingle();

      if (existing) {
        // Reset it for re-review
        await supabase
          .from("spaced_cards")
          .update({
            repetitions: 0,
            interval_days: INITIAL_INTERVAL,
            ease_factor: INITIAL_EASE,
            next_review: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("spaced_cards").insert({
          user_id: user.id,
          question_id: questionId,
          ease_factor: INITIAL_EASE,
          interval_days: INITIAL_INTERVAL,
          repetitions: 0,
          next_review: new Date().toISOString(),
        });
      }
    },
    [user]
  );

  return { dueCards, stats, reviewCard, addToQueue, refresh: fetchDueCards };
}
