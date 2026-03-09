-- Add Drishti-style content columns to articles table
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS upsc_relevance numeric DEFAULT NULL;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS depth_tier text DEFAULT NULL;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS prelims_keywords text[] DEFAULT '{}';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS mains_angle text DEFAULT NULL;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS mains_question text DEFAULT NULL;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS detailed_analysis jsonb DEFAULT NULL;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS conclusion text DEFAULT NULL;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT NULL;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS gs_papers text[] DEFAULT '{}';

-- Add check constraint for depth_tier values
ALTER TABLE public.articles ADD CONSTRAINT articles_depth_tier_check
  CHECK (depth_tier IS NULL OR depth_tier IN ('deep_analysis', 'important_facts', 'rapid_fire'));

-- Add check constraint for upsc_relevance range
ALTER TABLE public.articles ADD CONSTRAINT articles_upsc_relevance_check
  CHECK (upsc_relevance IS NULL OR (upsc_relevance >= 0.0 AND upsc_relevance <= 1.0));

-- Index for filtering by relevance and tier on the home page
CREATE INDEX IF NOT EXISTS idx_articles_relevance_tier
  ON public.articles (upsc_relevance, depth_tier)
  WHERE processed = true AND upsc_relevance IS NOT NULL;
