// ═══════════════════════════════════════════
// PYQ Types & Stubbed Functions
// PYQ database schema not yet implemented — all functions return empty data
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

// ─── All functions stubbed until PYQ schema is implemented ───

export async function fetchRelatedPYQs(_articleId: string): Promise<PYQQuestion[]> {
  return [];
}

export async function fetchPYQsForPractice(_options?: {
  exam_stage?: "prelims" | "mains" | null;
  paper_code?: string | null;
  year?: number | null;
  topic?: string | null;
  gs_paper?: string | null;
  limit?: number;
}): Promise<PYQQuestion[]> {
  return [];
}

export async function fetchPYQTopicCounts(): Promise<Record<string, number>> {
  return {};
}

export async function fetchPYQTopicStats(): Promise<PYQTopicStat[]> {
  return [];
}

export async function fetchPYQYearBreakdown(): Promise<PYQYearBreakdown[]> {
  return [];
}

export async function searchPYQs(_options: {
  query: string;
  exam_stage?: "prelims" | "mains" | null;
  paper_code?: string | null;
  year?: number | null;
  gs_paper?: string | null;
  limit?: number;
}): Promise<PYQQuestion[]> {
  return [];
}

export async function fetchPYQYears(): Promise<number[]> {
  return [];
}

export async function savePYQAttempt(_params: {
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
  return null;
}

export async function fetchPYQDashboardStats(_userId: string) {
  return {
    totalSolved: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    prelimsAccuracy: 0,
    mainsAttempted: 0,
    totalXP: 0,
  };
}

export async function fetchPYQWeakTopics(_userId: string): Promise<{ topic: string; accuracy: number }[]> {
  return [];
}
