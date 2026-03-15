-- Article feedback table for thumbs up/down on articles
CREATE TABLE IF NOT EXISTS public.article_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  vote text NOT NULL CHECK (vote IN ('up', 'down')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for querying feedback by article
CREATE INDEX IF NOT EXISTS idx_article_feedback_article_id ON public.article_feedback(article_id);

-- Allow anonymous inserts (feedback doesn't require auth)
ALTER TABLE public.article_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback"
  ON public.article_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Feedback is readable by service role only"
  ON public.article_feedback FOR SELECT
  USING (false);

COMMENT ON TABLE public.article_feedback IS 'Simple thumbs up/down feedback on articles. Anonymous, no user tracking.';
