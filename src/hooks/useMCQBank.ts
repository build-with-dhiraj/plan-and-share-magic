import { supabase } from "@/integrations/supabase/client";
import { sampleMCQs, type MCQ } from "@/data/sampleMCQs";

/**
 * Fetch MCQs from the Cloud mcq_bank table.
 * Falls back to local sampleMCQs if no DB results or user is unauthenticated.
 */
export async function fetchMCQs(options?: {
  topic?: string | null;
  limit?: number;
  dailyEligible?: boolean;
}): Promise<MCQ[]> {
  const { topic, limit = 50, dailyEligible } = options || {};

  try {
    let query = supabase
      .from("mcq_bank")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (topic) {
      query = query.eq("topic", topic);
    }
    if (dailyEligible) {
      query = query.eq("is_daily_eligible", true);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      // Fallback to sample data
      return filterSample(topic);
    }

    // Map DB rows to MCQ interface
    return data.map((row: any) => ({
      id: row.id,
      question: row.question,
      statements: row.statements || undefined,
      options: row.options,
      correctIndex: row.correct_index,
      explanation: row.explanation,
      topic: row.topic,
      difficulty: row.difficulty as MCQ["difficulty"],
      source: row.source || undefined,
      year: row.year || undefined,
      timeLimit: row.time_limit || 60,
    }));
  } catch {
    return filterSample(topic);
  }
}

/**
 * Fetch MCQs generated from today's processed articles.
 * Fallback cascade: today → last 3 days → all daily-eligible → sample MCQs.
 */
export async function fetchTodaysMCQs(limit: number = 20): Promise<MCQ[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const mapRows = (rows: any[]): MCQ[] =>
    rows.map((row: any) => ({
      id: row.id,
      question: row.question,
      statements: row.statements || undefined,
      options: row.options,
      correctIndex: row.correct_index,
      explanation: row.explanation,
      topic: row.topic,
      difficulty: row.difficulty as MCQ["difficulty"],
      source: row.source || undefined,
      year: row.year || undefined,
      timeLimit: row.time_limit || 60,
    }));

  try {
    // Try today's article-linked MCQs
    const { data, error } = await supabase
      .from("mcq_bank")
      .select("*")
      .not("article_id", "is", null)
      .gte("created_at", todayISO)
      .eq("is_daily_eligible", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data && data.length >= 5) {
      return mapRows(data);
    }

    // Fallback: last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const { data: recentData } = await supabase
      .from("mcq_bank")
      .select("*")
      .not("article_id", "is", null)
      .gte("created_at", threeDaysAgo.toISOString())
      .eq("is_daily_eligible", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (recentData && recentData.length >= 5) {
      return mapRows(recentData);
    }

    // Fallback: all daily-eligible
    return fetchMCQs({ dailyEligible: true, limit });
  } catch {
    return fetchMCQs({ dailyEligible: true, limit });
  }
}

function filterSample(topic?: string | null): MCQ[] {
  if (topic) return sampleMCQs.filter((q) => q.topic === topic);
  return sampleMCQs;
}

/**
 * Get topic counts from the MCQ bank (with fallback to sample data).
 */
export async function fetchTopicCounts(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from("mcq_bank")
      .select("topic");

    if (error || !data || data.length === 0) {
      return sampleCounts();
    }

    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.topic] = (counts[row.topic] || 0) + 1;
    }
    // Merge with sample counts so topics without DB data still show
    const sample = sampleCounts();
    for (const [k, v] of Object.entries(sample)) {
      counts[k] = (counts[k] || 0) + v;
    }
    return counts;
  } catch {
    return sampleCounts();
  }
}

function sampleCounts(): Record<string, number> {
  const c: Record<string, number> = {};
  for (const q of sampleMCQs) {
    c[q.topic] = (c[q.topic] || 0) + 1;
  }
  return c;
}
