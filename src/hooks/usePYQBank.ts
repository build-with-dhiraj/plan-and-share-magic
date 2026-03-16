// ═══════════════════════════════════════════
// PYQ Types & Functions — Official UPSC Previous Year Questions
// Real Supabase queries (replaces stubs)
// ═══════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";

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
  options?: PYQOption[];
  official_key?: PYQKey | null;
}

export interface PYQOption {
  id: string;
  option_label: string;
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

// ─── Helper: Hydrate question IDs into full PYQQuestion objects ───

async function fetchPYQsByIds(ids: string[]): Promise<PYQQuestion[]> {
  if (ids.length === 0) return [];

  // Fetch questions, options, and keys in parallel
  const [questionsRes, optionsRes, keysRes] = await Promise.all([
    supabase
      .from("pyq_questions")
      .select("*")
      .in("id", ids)
      .eq("is_published", true),
    supabase
      .from("pyq_prelims_options")
      .select("*")
      .in("question_id", ids)
      .order("sort_order", { ascending: true }),
    supabase
      .from("pyq_prelims_keys")
      .select("*")
      .in("question_id", ids),
  ]);

  const questions = (questionsRes.data ?? []) as any[];
  const options = (optionsRes.data ?? []) as any[];
  const keys = (keysRes.data ?? []) as any[];

  // Group options by question_id
  const optionsByQ = new Map<string, PYQOption[]>();
  for (const opt of options) {
    const qOpts = optionsByQ.get(opt.question_id) ?? [];
    qOpts.push({
      id: opt.id,
      option_label: (opt.option_label || "").toUpperCase(),
      option_text: opt.option_text,
      sort_order: opt.sort_order,
    });
    optionsByQ.set(opt.question_id, qOpts);
  }

  // Group keys by question_id (prefer official)
  const keyByQ = new Map<string, PYQKey>();
  for (const key of keys) {
    const existing = keyByQ.get(key.question_id);
    // Prefer official keys over unofficial
    if (!existing || key.is_official) {
      keyByQ.set(key.question_id, {
        answer_label: (key.answer_label || "").toUpperCase(),
        key_source: key.key_source,
        is_official: key.is_official,
      });
    }
  }

  // Assemble full PYQQuestion objects
  return questions.map((q) => ({
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
    gs_papers: q.gs_papers || [],
    topic: q.topic,
    syllabus_tags: q.syllabus_tags || [],
    confidence_score: q.confidence_score ?? 0.8,
    options: optionsByQ.get(q.id) ?? [],
    official_key: keyByQ.get(q.id) ?? null,
  }));
}

// ─── Main: fetchRelatedPYQs — Two-tier matching ───

export async function fetchRelatedPYQs(articleId: string): Promise<PYQQuestion[]> {
  // Tier 1: Pre-computed links from issue_pyq_links
  const { data: links } = await supabase
    .from("issue_pyq_links")
    .select("pyq_question_id, confidence_score")
    .eq("article_id", articleId)
    .eq("is_published", true)
    .order("confidence_score", { ascending: false })
    .limit(5);

  if (links && links.length > 0) {
    const ids = links.map((l: any) => l.pyq_question_id);
    return fetchPYQsByIds(ids);
  }

  // Tier 2: Real-time fallback — get article tags and match via RPC
  const { data: article } = await supabase
    .from("articles")
    .select("gs_papers, syllabus_tags")
    .eq("id", articleId)
    .single();

  if (!article) return [];

  const gsPapers = article.gs_papers || [];
  const syllabusTags = article.syllabus_tags || [];

  if (gsPapers.length === 0 && syllabusTags.length === 0) return [];

  const { data: matches } = await supabase.rpc("match_pyqs_by_tags", {
    p_gs_papers: gsPapers,
    p_syllabus_tags: syllabusTags,
    p_limit: 5,
  });

  if (!matches || matches.length === 0) return [];

  const ids = matches.map((m: any) => m.question_id);
  return fetchPYQsByIds(ids);
}

// ─── Practice: fetchPYQsForPractice ───

export async function fetchPYQsForPractice(options?: {
  exam_stage?: "prelims" | "mains" | null;
  paper_code?: string | null;
  year?: number | null;
  topic?: string | null;
  gs_paper?: string | null;
  limit?: number;
}): Promise<PYQQuestion[]> {
  let query = supabase
    .from("pyq_questions")
    .select("id")
    .eq("is_published", true);

  if (options?.exam_stage) query = query.eq("exam_stage", options.exam_stage);
  if (options?.paper_code) query = query.eq("paper_code", options.paper_code);
  if (options?.year) query = query.eq("year", options.year);
  if (options?.topic) query = query.eq("topic", options.topic);
  if (options?.gs_paper) query = query.contains("gs_papers", [options.gs_paper]);

  query = query.order("year", { ascending: false }).limit(options?.limit ?? 20);

  const { data } = await query;
  if (!data || data.length === 0) return [];

  return fetchPYQsByIds(data.map((d: any) => d.id));
}

// ─── Stats: fetchPYQTopicCounts ───

export async function fetchPYQTopicCounts(): Promise<Record<string, number>> {
  const stats = await fetchPYQTopicStats();
  const counts: Record<string, number> = {};
  for (const s of stats) {
    counts[s.topic] = s.total_count;
  }
  return counts;
}

// ─── Stats: fetchPYQTopicStats via RPC ───

export async function fetchPYQTopicStats(): Promise<PYQTopicStat[]> {
  const { data } = await supabase.rpc("get_pyq_topic_stats");
  if (!data) return [];
  return data.map((d: any) => ({
    topic: d.topic,
    total_count: Number(d.total_count),
    prelims_count: Number(d.prelims_count),
    mains_count: Number(d.mains_count),
    year_range: d.year_range,
  }));
}

// ─── Stats: fetchPYQYearBreakdown via RPC ───

export async function fetchPYQYearBreakdown(): Promise<PYQYearBreakdown[]> {
  const { data } = await supabase.rpc("get_pyq_year_breakdown");
  if (!data) return [];
  return data.map((d: any) => ({
    year: d.year,
    exam_stage: d.exam_stage,
    paper_code: d.paper_code,
    question_count: Number(d.question_count),
  }));
}

// ─── Search: searchPYQs ───

export async function searchPYQs(options: {
  query: string;
  exam_stage?: "prelims" | "mains" | null;
  paper_code?: string | null;
  year?: number | null;
  gs_paper?: string | null;
  limit?: number;
}): Promise<PYQQuestion[]> {
  let query = supabase
    .from("pyq_questions")
    .select("id")
    .eq("is_published", true)
    .textSearch("search_vector", options.query, { type: "websearch" });

  if (options.exam_stage) query = query.eq("exam_stage", options.exam_stage);
  if (options.paper_code) query = query.eq("paper_code", options.paper_code);
  if (options.year) query = query.eq("year", options.year);
  if (options.gs_paper) query = query.contains("gs_papers", [options.gs_paper]);

  query = query.limit(options.limit ?? 20);

  const { data } = await query;
  if (!data || data.length === 0) return [];

  return fetchPYQsByIds(data.map((d: any) => d.id));
}

// ─── Years: fetchPYQYears ───

export async function fetchPYQYears(): Promise<number[]> {
  const { data } = await supabase
    .from("pyq_questions")
    .select("year")
    .eq("is_published", true)
    .order("year", { ascending: false });

  if (!data) return [];

  // Deduplicate
  return [...new Set(data.map((d: any) => d.year as number))];
}

// ─── Attempts: savePYQAttempt ───

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
  // Insert attempt
  const { data: attempt, error: attemptErr } = await supabase
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

  if (attemptErr || !attempt) return null;

  // Insert individual answers
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

  return attempt;
}

// ─── Dashboard: fetchPYQDashboardStats ───

export async function fetchPYQDashboardStats(userId: string) {
  const { data: attempts } = await supabase
    .from("user_pyq_attempts")
    .select("practice_type, total_questions, correct_answers, total_xp")
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

  let totalSolved = 0;
  let totalCorrect = 0;
  let prelimsSolved = 0;
  let prelimsCorrect = 0;
  let mainsAttempted = 0;
  let totalXP = 0;

  for (const a of attempts) {
    totalSolved += a.total_questions || 0;
    totalCorrect += a.correct_answers || 0;
    totalXP += a.total_xp || 0;
    if (a.practice_type === "prelims") {
      prelimsSolved += a.total_questions || 0;
      prelimsCorrect += a.correct_answers || 0;
    }
    if (a.practice_type === "mains") {
      mainsAttempted += a.total_questions || 0;
    }
  }

  return {
    totalSolved,
    totalCorrect,
    totalAttempts: attempts.length,
    prelimsAccuracy: prelimsSolved > 0 ? Math.round((prelimsCorrect / prelimsSolved) * 100) : 0,
    mainsAttempted,
    totalXP,
  };
}

// ─── Weak Topics: fetchPYQWeakTopics ───

export async function fetchPYQWeakTopics(userId: string): Promise<{ topic: string; accuracy: number }[]> {
  // Get all user answers with question topics
  const { data: answers } = await supabase
    .from("user_pyq_answers")
    .select("pyq_question_id, is_correct")
    .eq("user_id", userId);

  if (!answers || answers.length === 0) return [];

  // Get topics for answered questions
  const qIds = [...new Set(answers.map((a: any) => a.pyq_question_id))];
  const { data: questions } = await supabase
    .from("pyq_questions")
    .select("id, topic")
    .in("id", qIds);

  if (!questions) return [];

  const topicMap = new Map<string, string>();
  for (const q of questions) {
    if (q.topic) topicMap.set(q.id, q.topic);
  }

  // Aggregate by topic
  const topicStats = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const topic = topicMap.get(a.pyq_question_id);
    if (!topic) continue;
    const stats = topicStats.get(topic) ?? { correct: 0, total: 0 };
    stats.total++;
    if (a.is_correct) stats.correct++;
    topicStats.set(topic, stats);
  }

  // Return topics sorted by accuracy (worst first)
  return Array.from(topicStats.entries())
    .map(([topic, stats]) => ({
      topic,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}
