-- ============================================
-- UPSC Daily — Full Database Setup (idempotent)
-- Run this in your Supabase SQL Editor
-- ============================================

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- User Roles (type safe create)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  exam_target TEXT,
  optional_subjects TEXT[],
  study_hours_per_day INTEGER DEFAULT 4,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User Streaks
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can insert own streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can update own streaks" ON public.user_streaks;
CREATE POLICY "Users can view own streaks" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_streaks_updated_at ON public.user_streaks;
CREATE TRIGGER update_streaks_updated_at BEFORE UPDATE ON public.user_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('practice', 'daily_challenge', 'topic_drill')),
  topic TEXT,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  total_xp INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  timed_mode BOOLEAN DEFAULT false,
  duration_seconds INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_type ON public.quiz_attempts (quiz_type, completed_at DESC);

-- Quiz Answers
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  selected_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds NUMERIC(5,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Users can insert own answers" ON public.quiz_answers;
CREATE POLICY "Users can view own answers" ON public.quiz_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own answers" ON public.quiz_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt ON public.quiz_answers (attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON public.quiz_answers (user_id, question_id);

-- Daily Challenge Completions
CREATE TABLE IF NOT EXISTS public.daily_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  total_xp INTEGER NOT NULL DEFAULT 0,
  completion_bonus INTEGER NOT NULL DEFAULT 25,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_date)
);
ALTER TABLE public.daily_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view daily completions" ON public.daily_completions;
DROP POLICY IF EXISTS "Users can insert own completions" ON public.daily_completions;
CREATE POLICY "Anyone can view daily completions" ON public.daily_completions FOR SELECT USING (true);
CREATE POLICY "Users can insert own completions" ON public.daily_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_completions_date ON public.daily_completions (challenge_date DESC, total_xp DESC);

-- Leaderboard View
DROP VIEW IF EXISTS public.daily_leaderboard;
CREATE OR REPLACE VIEW public.daily_leaderboard
WITH (security_invoker = true)
AS
SELECT dc.user_id, p.display_name, p.avatar_url, dc.score, dc.total_xp, dc.challenge_date,
  RANK() OVER (PARTITION BY dc.challenge_date ORDER BY dc.total_xp DESC, dc.completed_at ASC) AS rank
FROM public.daily_completions dc
JOIN public.profiles p ON p.user_id = dc.user_id
WHERE dc.challenge_date = CURRENT_DATE;

-- Bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('issue', 'article', 'mcq')),
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Spaced Repetition Cards
CREATE TABLE IF NOT EXISTS public.spaced_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
  interval_days INTEGER NOT NULL DEFAULT 1,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review DATE NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
ALTER TABLE public.spaced_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cards" ON public.spaced_cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON public.spaced_cards;
DROP POLICY IF EXISTS "Users can update own cards" ON public.spaced_cards;
CREATE POLICY "Users can view own cards" ON public.spaced_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON public.spaced_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON public.spaced_cards FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_spaced_cards_review ON public.spaced_cards (user_id, next_review);

DROP TRIGGER IF EXISTS update_spaced_cards_updated_at ON public.spaced_cards;
CREATE TRIGGER update_spaced_cards_updated_at BEFORE UPDATE ON public.spaced_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== CONTENT PIPELINE TABLES =====

-- Articles
CREATE TABLE IF NOT EXISTS public.articles (
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
  layer text DEFAULT 'B',
  upsc_relevance numeric DEFAULT NULL,
  depth_tier text DEFAULT NULL,
  prelims_keywords text[] DEFAULT '{}',
  mains_angle text DEFAULT NULL,
  mains_question text DEFAULT NULL,
  detailed_analysis jsonb DEFAULT NULL,
  conclusion text DEFAULT NULL,
  faqs jsonb DEFAULT NULL,
  gs_papers text[] DEFAULT '{}'
);
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read articles" ON public.articles;
DROP POLICY IF EXISTS "Anon users can read articles" ON public.articles;
CREATE POLICY "Authenticated users can read articles" ON public.articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon users can read articles" ON public.articles FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_articles_processed ON public.articles(processed);
CREATE INDEX IF NOT EXISTS idx_articles_source ON public.articles(source_name);
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles(published_at DESC);

DO $$ BEGIN
  ALTER TABLE public.articles ADD CONSTRAINT articles_depth_tier_check
    CHECK (depth_tier IS NULL OR depth_tier IN ('deep_analysis', 'important_facts', 'rapid_fire'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.articles ADD CONSTRAINT articles_upsc_relevance_check
    CHECK (upsc_relevance IS NULL OR (upsc_relevance >= 0.0 AND upsc_relevance <= 1.0));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_articles_relevance_tier
  ON public.articles (upsc_relevance, depth_tier)
  WHERE processed = true AND upsc_relevance IS NOT NULL;

-- Facts
CREATE TABLE IF NOT EXISTS public.facts (
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

DROP POLICY IF EXISTS "Authenticated users can read facts" ON public.facts;
DROP POLICY IF EXISTS "Anon users can read facts" ON public.facts;
CREATE POLICY "Authenticated users can read facts" ON public.facts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon users can read facts" ON public.facts FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_facts_article ON public.facts(article_id);
CREATE INDEX IF NOT EXISTS idx_facts_tags ON public.facts USING GIN(syllabus_tags);

-- MCQ Bank
CREATE TABLE IF NOT EXISTS public.mcq_bank (
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

DROP POLICY IF EXISTS "Authenticated users can read mcqs" ON public.mcq_bank;
DROP POLICY IF EXISTS "Anon users can read mcqs" ON public.mcq_bank;
CREATE POLICY "Authenticated users can read mcqs" ON public.mcq_bank FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon users can read mcqs" ON public.mcq_bank FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_mcq_topic ON public.mcq_bank(topic);
CREATE INDEX IF NOT EXISTS idx_mcq_difficulty ON public.mcq_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_mcq_daily ON public.mcq_bank(is_daily_eligible) WHERE is_daily_eligible = true;
CREATE INDEX IF NOT EXISTS idx_mcq_tags ON public.mcq_bank USING GIN(syllabus_tags);
CREATE INDEX IF NOT EXISTS idx_mcq_created ON public.mcq_bank(created_at DESC);

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- RSS Sources
CREATE TABLE IF NOT EXISTS public.rss_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL UNIQUE,
  category text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rss_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read rss_sources" ON public.rss_sources;
CREATE POLICY "Anyone can read rss_sources" ON public.rss_sources FOR SELECT USING (true);

-- Seed RSS sources
INSERT INTO public.rss_sources (name, url, category) VALUES
  ('The Hindu - National', 'https://www.thehindu.com/news/national/feeder/default.rss', 'National'),
  ('The Hindu - International', 'https://www.thehindu.com/news/international/feeder/default.rss', 'International'),
  ('The Hindu - Editorial', 'https://www.thehindu.com/opinion/editorial/feeder/default.rss', 'Editorial'),
  ('Indian Express - India', 'https://indianexpress.com/section/india/feed/', 'National'),
  ('Indian Express - Economy', 'https://indianexpress.com/section/business/economy/feed/', 'Economy'),
  ('Indian Express - Explained', 'https://indianexpress.com/section/explained/feed/', 'Explained'),
  ('LiveMint - Politics', 'https://www.livemint.com/rss/politics', 'Polity'),
  ('LiveMint - Economy', 'https://www.livemint.com/rss/economy', 'Economy'),
  ('PIB - Press Releases', 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3', 'Government'),
  ('Down To Earth - Environment', 'https://www.downtoearth.org.in/rss/environment', 'Environment'),
  ('Down To Earth - Science', 'https://www.downtoearth.org.in/rss/science-technology', 'Science')
ON CONFLICT (url) DO NOTHING;
