
-- ===== CONTENT PIPELINE TABLES =====

-- 1. Articles: raw ingested content from RSS/scraping
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL UNIQUE,
  title text NOT NULL,
  content text,
  summary text,
  published_at timestamptz,
  ingested_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false,
  syllabus_tags text[] DEFAULT '{}',
  layer text DEFAULT 'B'
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read articles"
  ON public.articles FOR SELECT TO authenticated
  USING (true);

CREATE INDEX idx_articles_processed ON public.articles(processed);
CREATE INDEX idx_articles_source ON public.articles(source_name);
CREATE INDEX idx_articles_published ON public.articles(published_at DESC);

-- 2. Facts: extracted prelims facts with source traceability
CREATE TABLE public.facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE,
  fact_text text NOT NULL,
  source_url text NOT NULL,
  syllabus_tags text[] DEFAULT '{}',
  confidence numeric DEFAULT 0.8,
  created_at timestamptz DEFAULT now(),
  verified boolean DEFAULT false
);

ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read facts"
  ON public.facts FOR SELECT TO authenticated
  USING (true);

CREATE INDEX idx_facts_article ON public.facts(article_id);
CREATE INDEX idx_facts_tags ON public.facts USING GIN(syllabus_tags);

-- 3. MCQ Bank: AI-generated and curated MCQs
CREATE TABLE public.mcq_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  statements text[],
  options text[] NOT NULL,
  correct_index integer NOT NULL,
  explanation text NOT NULL,
  topic text NOT NULL,
  difficulty text DEFAULT 'medium',
  source text,
  source_url text,
  fact_id uuid REFERENCES public.facts(id),
  article_id uuid REFERENCES public.articles(id),
  syllabus_tags text[] DEFAULT '{}',
  year text,
  time_limit integer DEFAULT 60,
  is_daily_eligible boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.mcq_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mcqs"
  ON public.mcq_bank FOR SELECT TO authenticated
  USING (true);

CREATE INDEX idx_mcq_topic ON public.mcq_bank(topic);
CREATE INDEX idx_mcq_difficulty ON public.mcq_bank(difficulty);
CREATE INDEX idx_mcq_daily ON public.mcq_bank(is_daily_eligible) WHERE is_daily_eligible = true;
CREATE INDEX idx_mcq_tags ON public.mcq_bank USING GIN(syllabus_tags);
CREATE INDEX idx_mcq_created ON public.mcq_bank(created_at DESC);
