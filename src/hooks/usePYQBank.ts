import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════
// PYQ Types — Official UPSC Previous Year Questions
// ═══════════════════════════════════════════

export interface PYQQuestion {
  id: string;
  year: number;
  exam_stage: "prelims" | "mains";
  paper_code: string;
  question_number: number | null;
  question_text: string;
  question_type: "mcq" | "descriptive" | "case_study";
  marks: number | null;
  word_limit: number | null;
  is_published: boolean;
  verification_status: string;
  gs_papers: string[];
  topic: string | null;
  syllabus_tags: string[];
  confidence_score: number;
  // Joined data (optional)
  options?: PYQOption[];
  official_key?: PYQKey | null;
}

export interface PYQOption {
  id: string;
  option_label: string; // A, B, C, D
  option_text: string;
  sort_order: number | null;
}

export interface PYQKey {
  answer_label: string;
  key_source: string;
  is_official: boolean;
}

export interface PYQLink {
  id: string;
  article_id: string;
  pyq_question_id: string;
  link_type: string;
  link_reason: string | null;
  confidence_score: number;
  question?: PYQQuestion;
}

export interface PYQTopicStat {
  topic: string;
  total_count: number;
  prelims_count: number;
  mains_count: number;
  year_range: string;
}

export interface PYQYearBreakdown {
  year: number;
  exam_stage: string;
  paper_code: string;
  question_count: number;
}

// ═══════════════════════════════════════════
// Fetch PYQs linked to a specific article
// ═══════════════════════════════════════════
export async function fetchRelatedPYQs(articleId: string): Promise<PYQQuestion[]> {
  try {
    const { data, error } = await supabase
      .from("issue_pyq_links")
      .select(
        `
        id, link_type, link_reason, confidence_score,
        pyq_questions!inner (
          id, year, exam_stage, paper_code, question_number,
          question_text, question_type, marks, word_limit,
          is_published, verification_status, gs_papers, topic,
          syllabus_tags, confidence_score
        )
      `,
      )
      .eq("article_id", articleId)
      .eq("is_published", true)
      .gte("confidence_score", 0.5)
      .order("confidence_score", { ascending: false })
      .limit(10);

    if (error || !data) return [];

    // Flatten and fetch options + keys for each PYQ
    const questions: PYQQuestion[] = [];
    for (const link of data as any[]) {
      const q = link.pyq_questions;
      if (!q || !q.is_published) continue;

      const pyq: PYQQuestion = {
        id: q.id,
        year: q.year,
        exam_stage: q.exam_stage,
        paper_code: q.paper_code,
        question_number: q.question_number,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        word_limit: q.word_limit,
        is_published: q.is_published,
        verification_status: q.verification_status,
        gs_papers: q.gs_papers ?? [],
        topic: q.topic,
        syllabus_tags: q.syllabus_tags ?? [],
        confidence_score: q.confidence_score,
      };

      // Fetch options for prelims MCQs
      if (q.question_type === "mcq") {
        const { data: opts } = await supabase
          .from("pyq_prelims_options")
          .select("id, option_label, option_text, sort_order")
          .eq("question_id", q.id)
          .order("sort_order", { ascending: true });
        pyq.options = opts ?? [];

        // Fetch official key
        const { data: key } = await supabase
          .from("pyq_prelims_keys")
          .select("answer_label, key_source, is_official")
          .eq("question_id", q.id)
          .order("is_official", { ascending: false })
          .limit(1)
          .maybeSingle();
        pyq.official_key = key ?? null;
      }

      questions.push(pyq);
    }

    return questions;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════
// Fetch PYQs for practice (with filters)
// ═══════════════════════════════════════════
export async function fetchPYQsForPractice(options?: {
  exam_stage?: "prelims" | "mains" | null;
  paper_code?: string | null;
  year?: number | null;
  topic?: string | null;
  gs_paper?: string | null;
  limit?: number;
}): Promise<PYQQuestion[]> {
  const { exam_stage, paper_code, year, topic, gs_paper, limit = 20 } = options || {};

  try {
    let query = supabase
      .from("pyq_questions")
      .select("*")
      .eq("is_published", true)
      .order("year", { ascending: false })
      .limit(limit);

    if (exam_stage) query = query.eq("exam_stage", exam_stage);
    if (paper_code) query = query.eq("paper_code", paper_code);
    if (year) query = query.eq("year", year);
    if (topic) query = query.eq("topic", topic);
    if (gs_paper) query = query.contains("gs_papers", [gs_paper]);

    const { data, error } = await query;
    if (error || !data) return [];

    // Fetch options and keys for all questions
    const questions: PYQQuestion[] = [];
    for (const q of data as any[]) {
      const pyq: PYQQuestion = {
        id: q.id,
        year: q.year,
        exam_stage: q.exam_stage,
        paper_code: q.paper_code,
        question_number: q.question_number,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        word_limit: q.word_limit,
        is_published: q.is_published,
        verification_status: q.verification_status,
        gs_papers: q.gs_papers ?? [],
        topic: q.topic,
        syllabus_tags: q.syllabus_tags ?? [],
        confidence_score: q.confidence_score,
      };

      if (q.question_type === "mcq") {
        const { data: opts } = await supabase
          .from("pyq_prelims_options")
          .select("id, option_label, option_text, sort_order")
          .eq("question_id", q.id)
          .order("sort_order", { ascending: true });
        pyq.options = opts ?? [];

        const { data: key } = await supabase
          .from("pyq_prelims_keys")
          .select("answer_label, key_source, is_official")
          .eq("question_id", q.id)
          .order("is_official", { ascending: false })
          .limit(1)
          .maybeSingle();
        pyq.official_key = key ?? null;
      }

      questions.push(pyq);
    }

    return questions;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════
// Get PYQ counts by topic
// ═══════════════════════════════════════════
export async function fetchPYQTopicCounts(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from("pyq_questions")
      .select("topic")
      .eq("is_published", true)
      .not("topic", "is", null);

    if (error || !data) return {};

    const counts: Record<string, number> = {};
    for (const row of data) {
      const t = (row as any).topic;
      if (t) counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

// ═══════════════════════════════════════════
// Get PYQ topic stats (via RPC)
// ═══════════════════════════════════════════
export async function fetchPYQTopicStats(): Promise<PYQTopicStat[]> {
  // RPC not yet created — return empty
  return [];
}

// ═══════════════════════════════════════════
// Get PYQ year breakdown (via RPC)
// ═══════════════════════════════════════════
export async function fetchPYQYearBreakdown(): Promise<PYQYearBreakdown[]> {
  try {
    const { data, error } = await supabase.rpc("get_pyq_year_breakdown");
    if (error || !data) return [];
    return data as PYQYearBreakdown[];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════
// Search PYQs by text
// ═══════════════════════════════════════════
export async function searchPYQs(options: {
  query: string;
  exam_stage?: "prelims" | "mains" | null;
  paper_code?: string | null;
  year?: number | null;
  gs_paper?: string | null;
  limit?: number;
}): Promise<PYQQuestion[]> {
  const { query, exam_stage, paper_code, year, gs_paper, limit = 20 } = options;

  try {
    // Use full-text search
    const tsQuery = query.trim().split(/\s+/).join(" & ");
    let q = supabase
      .from("pyq_questions")
      .select("*")
      .eq("is_published", true)
      .textSearch("search_vector", tsQuery)
      .limit(limit);

    if (exam_stage) q = q.eq("exam_stage", exam_stage);
    if (paper_code) q = q.eq("paper_code", paper_code);
    if (year) q = q.eq("year", year);
    if (gs_paper) q = q.contains("gs_papers", [gs_paper]);

    const { data, error } = await q;
    if (error || !data) return [];

    return (data as any[]).map((row) => ({
      id: row.id,
      year: row.year,
      exam_stage: row.exam_stage,
      paper_code: row.paper_code,
      question_number: row.question_number,
      question_text: row.question_text,
      question_type: row.question_type,
      marks: row.marks,
      word_limit: row.word_limit,
      is_published: row.is_published,
      verification_status: row.verification_status,
      gs_papers: row.gs_papers ?? [],
      topic: row.topic,
      syllabus_tags: row.syllabus_tags ?? [],
      confidence_score: row.confidence_score,
    }));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════
// Get available years
// ═══════════════════════════════════════════
export async function fetchPYQYears(): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from("pyq_questions")
      .select("year")
      .eq("is_published", true)
      .order("year", { ascending: false });

    if (error || !data) return [];
    return [...new Set((data as any[]).map((r) => r.year))];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════
// Save PYQ practice attempt
// ═══════════════════════════════════════════
export async function savePYQAttempt(params: {
  userId: string;
  practiceType: "prelims" | "mains" | "mixed";
  yearFilter?: number;
  paperFilter?: string;
  totalQuestions: number;
  correctAnswers: number;
  totalXP: number;
  answers: {
    pyqQuestionId: string;
    selectedOption?: string;
    isCorrect?: boolean;
    answerText?: string;
    timeTakenSeconds?: number;
    xpEarned?: number;
  }[];
}) {
  try {
    // Create attempt record
    const { data: attempt, error: attemptError } = await supabase
      .from("user_pyq_attempts")
      .insert({
        user_id: params.userId,
        practice_type: params.practiceType,
        year_filter: params.yearFilter ?? null,
        paper_filter: params.paperFilter ?? null,
        total_questions: params.totalQuestions,
        correct_answers: params.correctAnswers,
        total_xp: params.totalXP,
      })
      .select("id")
      .single();

    if (attemptError || !attempt) return null;

    // Create individual answer records
    if (params.answers.length > 0) {
      const answerRows = params.answers.map((a) => ({
        attempt_id: attempt.id,
        user_id: params.userId,
        pyq_question_id: a.pyqQuestionId,
        selected_option: a.selectedOption ?? null,
        is_correct: a.isCorrect ?? null,
        answer_text: a.answerText ?? null,
        time_taken_seconds: a.timeTakenSeconds ?? null,
        xp_earned: a.xpEarned ?? 0,
      }));

      await supabase.from("user_pyq_answers").insert(answerRows);
    }

    return attempt.id;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════
// Get PYQ dashboard stats for a user
// ═══════════════════════════════════════════
export async function fetchPYQDashboardStats(userId: string) {
  try {
    // Fetch all user's PYQ attempts
    const { data: attempts } = await supabase
      .from("user_pyq_attempts")
      .select("total_questions, correct_answers, total_xp, practice_type")
      .eq("user_id", userId);

    if (!attempts || attempts.length === 0) {
      return {
        totalSolved: 0,
        totalCorrect: 0,
        totalAttempts: 0,
        prelimsAccuracy: 0,
        mainsAttempted: 0,
        totalXP: 0,
      };
    }

    const prelims = attempts.filter((a: any) => a.practice_type === "prelims");
    const mains = attempts.filter((a: any) => a.practice_type === "mains");

    const totalSolved = attempts.reduce((s: number, a: any) => s + (a.total_questions || 0), 0);
    const totalCorrect = attempts.reduce((s: number, a: any) => s + (a.correct_answers || 0), 0);
    const prelimsTotal = prelims.reduce((s: number, a: any) => s + (a.total_questions || 0), 0);
    const prelimsCorrect = prelims.reduce((s: number, a: any) => s + (a.correct_answers || 0), 0);
    const totalXP = attempts.reduce((s: number, a: any) => s + (a.total_xp || 0), 0);

    return {
      totalSolved,
      totalCorrect,
      totalAttempts: attempts.length,
      prelimsAccuracy: prelimsTotal > 0 ? Math.round((prelimsCorrect / prelimsTotal) * 100) : 0,
      mainsAttempted: mains.reduce((s: number, a: any) => s + (a.total_questions || 0), 0),
      totalXP,
    };
  } catch {
    return {
      totalSolved: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      prelimsAccuracy: 0,
      mainsAttempted: 0,
      totalXP: 0,
    };
  }
}

// ═══════════════════════════════════════════
// Get PYQ weak topics for a user
// ═══════════════════════════════════════════
export async function fetchPYQWeakTopics(userId: string): Promise<{ topic: string; accuracy: number }[]> {
  try {
    const { data: answers } = await supabase
      .from("user_pyq_answers")
      .select("is_correct, pyq_questions!inner(topic)")
      .eq("user_id", userId)
      .not("is_correct", "is", null);

    if (!answers || answers.length === 0) return [];

    const topicStats: Record<string, { correct: number; total: number }> = {};
    for (const a of answers as any[]) {
      const topic = a.pyq_questions?.topic;
      if (!topic) continue;
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
      topicStats[topic].total++;
      if (a.is_correct) topicStats[topic].correct++;
    }

    return Object.entries(topicStats)
      .map(([topic, { correct, total }]) => ({
        topic,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      }))
      .filter((t) => t.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy);
  } catch {
    return [];
  }
}
