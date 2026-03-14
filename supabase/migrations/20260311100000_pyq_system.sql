-- ═══════════════════════════════════════════════════════════════
-- PYQ System: Complete Schema for UPSC Previous Year Questions
-- 14 new tables + spaced_cards extension + indexes + RLS
-- ═══════════════════════════════════════════════════════════════

-- Enable pgvector for semantic search (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════
-- 1. pyq_sources — Registry of PYQ data sources
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pyq_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('official', 'institutional', 'mirror')),
  base_url text,
  is_active boolean DEFAULT true,
  trust_level integer DEFAULT 0 CHECK (trust_level BETWEEN 0 AND 2),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pyq_sources ADD CONSTRAINT pyq_sources_name_type_uniq UNIQUE (name, source_type);

-- ═══════════════════════════════════════════
-- 2. pyq_documents — Ingested exam papers
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pyq_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.pyq_sources(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  exam_stage text NOT NULL CHECK (exam_stage IN ('prelims', 'mains')),
  paper_code text NOT NULL CHECK (paper_code IN ('gs1', 'gs2', 'gs3', 'gs4', 'essay', 'csat')),
  source_url text NOT NULL,
  source_file_hash text,
  raw_storage_path text,
  verification_status text DEFAULT 'pending'
    CHECK (verification_status IN ('official_verified', 'institutional_verified', 'mirror_unverified', 'pending')),
  is_official boolean DEFAULT false,
  official_release_date date,
  extraction_method text CHECK (extraction_method IN ('text_extract', 'ocr', 'manual')),
  parse_quality numeric CHECK (parse_quality BETWEEN 0 AND 1),
  human_reviewed boolean DEFAULT false,
  total_questions integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pyq_documents
  ADD CONSTRAINT pyq_documents_year_stage_paper_source_uniq
  UNIQUE (year, exam_stage, paper_code, source_id);

CREATE INDEX idx_pyq_documents_year_stage_paper ON public.pyq_documents (year, exam_stage, paper_code);
CREATE INDEX idx_pyq_documents_verification ON public.pyq_documents (verification_status);

-- ═══════════════════════════════════════════
-- 3. pyq_questions — Parsed questions
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pyq_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.pyq_documents(id) ON DELETE CASCADE,
  year integer NOT NULL,
  exam_stage text NOT NULL CHECK (exam_stage IN ('prelims', 'mains')),
  paper_code text NOT NULL,
  question_number integer,
  question_text text NOT NULL,
  raw_question_text text,
  question_type text NOT NULL CHECK (question_type IN ('mcq', 'descriptive', 'case_study')),
  marks integer,
  word_limit integer,
  raw_source_page integer,
  is_published boolean DEFAULT false,
  verification_status text DEFAULT 'pending'
    CHECK (verification_status IN ('official_verified', 'institutional_verified', 'mirror_unverified', 'pending')),
  parse_quality numeric DEFAULT 1.0 CHECK (parse_quality BETWEEN 0 AND 1),
  human_reviewed boolean DEFAULT false,
  confidence_score numeric DEFAULT 0.8 CHECK (confidence_score BETWEEN 0 AND 1),
  gs_papers text[] DEFAULT '{}',
  topic text,
  syllabus_tags text[] DEFAULT '{}',
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', question_text)) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pyq_questions
  ADD CONSTRAINT pyq_questions_doc_qnum_uniq UNIQUE (document_id, question_number);

CREATE INDEX idx_pyq_questions_year_stage ON public.pyq_questions (year, exam_stage);
CREATE INDEX idx_pyq_questions_paper ON public.pyq_questions (paper_code);
CREATE INDEX idx_pyq_questions_topic ON public.pyq_questions (topic);
CREATE INDEX idx_pyq_questions_published ON public.pyq_questions (is_published);
CREATE INDEX idx_pyq_questions_syllabus_tags ON public.pyq_questions USING gin (syllabus_tags);
CREATE INDEX idx_pyq_questions_gs_papers ON public.pyq_questions USING gin (gs_papers);
CREATE INDEX idx_pyq_questions_search ON public.pyq_questions USING gin (search_vector);

-- ═══════════════════════════════════════════
-- 4. pyq_prelims_options — MCQ options
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pyq_prelims_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.pyq_questions(id) ON DELETE CASCADE,
  option_label text NOT NULL CHECK (option_label IN ('A', 'B', 'C', 'D')),
  option_text text NOT NULL,
  sort_order integer
);

ALTER TABLE public.pyq_prelims_options
  ADD CONSTRAINT pyq_prelims_options_q_label_uniq UNIQUE (question_id, option_label);

-- ═══════════════════════════════════════════
-- 5. pyq_prelims_keys — Official answer keys
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pyq_prelims_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.pyq_questions(id) ON DELETE CASCADE,
  answer_label text NOT NULL CHECK (answer_label IN ('A', 'B', 'C', 'D', 'DROPPED')),
  key_source text NOT NULL CHECK (key_source IN ('upsc_final', 'consensus_unofficial')),
  is_official boolean NOT NULL DEFAULT false,
  source_url text,
  source_file_hash text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pyq_prelims_keys
  ADD CONSTRAINT pyq_prelims_keys_q_source_uniq UNIQUE (question_id, key_source);

-- ═══════════════════════════════════════════
-- 6. pyq_tags — Rich tagging
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pyq_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.pyq_questions(id) ON DELETE CASCADE,
  tag_type text NOT NULL CHECK (tag_type IN (
    'gs_paper', 'subject', 'topic', 'subtopic', 'theme',
    'static_anchor', 'current_affairs_theme'
  )),
  tag_value text NOT NULL,
  confidence numeric DEFAULT 1.0,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'ai_generated', 'rules_based'))
);

ALTER TABLE public.pyq_tags
  ADD CONSTRAINT pyq_tags_q_type_value_uniq UNIQUE (question_id, tag_type, tag_value);

CREATE INDEX idx_pyq_tags_type_value ON public.pyq_tags (tag_type, tag_value);
CREATE INDEX idx_pyq_tags_question ON public.pyq_tags (question_id);

-- ═══════════════════════════════════════════
-- 7. pyq_question_embeddings — Vector search
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pyq_question_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.pyq_questions(id) ON DELETE CASCADE UNIQUE,
  embedding vector(768),
  model text DEFAULT 'text-embedding-004',
  created_at timestamptz DEFAULT now()
);

-- HNSW index for fast ANN search
CREATE INDEX idx_pyq_embeddings_hnsw ON public.pyq_question_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ═══════════════════════════════════════════
-- 8. issue_pyq_links — Article ↔ PYQ mapping
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.issue_pyq_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  pyq_question_id uuid NOT NULL REFERENCES public.pyq_questions(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type IN (
    'direct_theme_match', 'static_dynamic_link', 'entity_overlap', 'syllabus_overlap'
  )),
  link_reason text,
  confidence_score numeric NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  lexical_score numeric,
  semantic_score numeric,
  syllabus_overlap_score numeric,
  gs_overlap_score numeric,
  human_reviewed boolean DEFAULT false,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.issue_pyq_links
  ADD CONSTRAINT issue_pyq_links_article_q_uniq UNIQUE (article_id, pyq_question_id);

CREATE INDEX idx_issue_pyq_links_article ON public.issue_pyq_links (article_id);
CREATE INDEX idx_issue_pyq_links_question ON public.issue_pyq_links (pyq_question_id);
CREATE INDEX idx_issue_pyq_links_confidence ON public.issue_pyq_links (confidence_score DESC);

-- ═══════════════════════════════════════════
-- 9. pyq_import_jobs — Ingestion tracking
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pyq_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.pyq_sources(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  document_url text,
  year integer,
  exam_stage text,
  paper_code text,
  questions_extracted integer DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 10. pyq_parse_events — Parse audit log
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pyq_parse_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.pyq_documents(id) ON DELETE CASCADE,
  event_type text CHECK (event_type IN (
    'text_extract', 'ocr_fallback', 'question_boundary_detect',
    'option_parse', 'quality_check'
  )),
  quality_score numeric,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 11. pyq_verification_events — Verification audit
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pyq_verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.pyq_questions(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.pyq_documents(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  reason text,
  verified_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 12. pyq_model_answers — Editorial answers (NEVER official)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pyq_model_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.pyq_questions(id) ON DELETE CASCADE,
  answer_type text NOT NULL CHECK (answer_type IN ('editorial', 'ai_generated', 'topper_reference')),
  answer_text text NOT NULL,
  answer_framework jsonb,
  source_attribution text,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 13. user_pyq_attempts — PYQ practice sessions
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_pyq_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  practice_type text NOT NULL CHECK (practice_type IN ('prelims', 'mains', 'mixed')),
  year_filter integer,
  paper_filter text,
  total_questions integer,
  correct_answers integer,
  total_xp integer DEFAULT 0,
  completed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_pyq_attempts_user ON public.user_pyq_attempts (user_id);

-- ═══════════════════════════════════════════
-- 14. user_pyq_answers — Individual PYQ answers
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_pyq_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.user_pyq_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  pyq_question_id uuid NOT NULL REFERENCES public.pyq_questions(id) ON DELETE CASCADE,
  selected_option text,
  is_correct boolean,
  answer_text text,
  time_taken_seconds numeric,
  xp_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_pyq_answers_user ON public.user_pyq_answers (user_id);
CREATE INDEX idx_user_pyq_answers_question ON public.user_pyq_answers (pyq_question_id);

-- ═══════════════════════════════════════════
-- 15. Extend spaced_cards — Add PYQ support
-- ═══════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'spaced_cards'
    AND column_name = 'question_source'
  ) THEN
    ALTER TABLE public.spaced_cards
      ADD COLUMN question_source text DEFAULT 'mcq_bank';
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════

-- Enable RLS on all new tables
ALTER TABLE public.pyq_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_prelims_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_prelims_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_question_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_pyq_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_parse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_model_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pyq_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pyq_answers ENABLE ROW LEVEL SECURITY;

-- ── Public read policies (for published/verified content) ──

CREATE POLICY "pyq_sources_public_read" ON public.pyq_sources
  FOR SELECT USING (true);

CREATE POLICY "pyq_documents_public_read" ON public.pyq_documents
  FOR SELECT USING (
    verification_status IN ('official_verified', 'institutional_verified')
  );

CREATE POLICY "pyq_questions_public_read" ON public.pyq_questions
  FOR SELECT USING (is_published = true);

CREATE POLICY "pyq_prelims_options_public_read" ON public.pyq_prelims_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pyq_questions q
      WHERE q.id = question_id AND q.is_published = true
    )
  );

CREATE POLICY "pyq_prelims_keys_public_read" ON public.pyq_prelims_keys
  FOR SELECT USING (true);

CREATE POLICY "pyq_tags_public_read" ON public.pyq_tags
  FOR SELECT USING (true);

CREATE POLICY "issue_pyq_links_public_read" ON public.issue_pyq_links
  FOR SELECT USING (is_published = true);

CREATE POLICY "pyq_model_answers_public_read" ON public.pyq_model_answers
  FOR SELECT USING (is_published = true);

-- ── User policies (own rows) ──

CREATE POLICY "user_pyq_attempts_user_read" ON public.user_pyq_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_pyq_attempts_user_insert" ON public.user_pyq_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_pyq_answers_user_read" ON public.user_pyq_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_pyq_answers_user_insert" ON public.user_pyq_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Service role full access (for edge functions) ──
-- Service role bypasses RLS by default in Supabase,
-- so no explicit policies needed for admin/service operations.

-- ═══════════════════════════════════════════
-- Seed: Initial PYQ sources
-- ═══════════════════════════════════════════
INSERT INTO public.pyq_sources (name, source_type, base_url, is_active, trust_level, notes)
VALUES
  ('UPSC Official', 'official', 'https://upsc.gov.in', true, 2,
   'Official UPSC question papers and answer keys from upsc.gov.in'),
  ('NDLI Archive', 'institutional', 'https://ndl.iitkgp.ac.in', true, 1,
   'National Digital Library of India — archival copies of UPSC papers'),
  ('ForumIAS Mirror', 'mirror', 'https://forumias.com', true, 0,
   'Community-maintained PYQ index with unofficial answer keys')
ON CONFLICT (name, source_type) DO NOTHING;

-- ═══════════════════════════════════════════
-- Helper function: semantic search over PYQ embeddings
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.match_pyq_questions(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  question_id uuid,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.question_id,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.pyq_question_embeddings e
  JOIN public.pyq_questions q ON q.id = e.question_id
  WHERE q.is_published = true
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ═══════════════════════════════════════════
-- Helper function: get PYQ stats per topic
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_pyq_topic_stats()
RETURNS TABLE (
  topic text,
  total_count bigint,
  prelims_count bigint,
  mains_count bigint,
  year_range text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    q.topic,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE q.exam_stage = 'prelims') AS prelims_count,
    COUNT(*) FILTER (WHERE q.exam_stage = 'mains') AS mains_count,
    MIN(q.year)::text || '-' || MAX(q.year)::text AS year_range
  FROM public.pyq_questions q
  WHERE q.is_published = true AND q.topic IS NOT NULL
  GROUP BY q.topic
  ORDER BY total_count DESC;
$$;

-- ═══════════════════════════════════════════
-- Helper function: get PYQ year-paper breakdown
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_pyq_year_breakdown()
RETURNS TABLE (
  year integer,
  exam_stage text,
  paper_code text,
  question_count bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    q.year,
    q.exam_stage,
    q.paper_code,
    COUNT(*) AS question_count
  FROM public.pyq_questions q
  WHERE q.is_published = true
  GROUP BY q.year, q.exam_stage, q.paper_code
  ORDER BY q.year DESC, q.exam_stage, q.paper_code;
$$;
