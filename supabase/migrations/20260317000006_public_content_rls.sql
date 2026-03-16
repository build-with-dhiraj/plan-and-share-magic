-- Drop the restrictively authenticated policies
DROP POLICY IF EXISTS "Authenticated users can read articles" ON public.articles;
DROP POLICY IF EXISTS "Authenticated users can read facts" ON public.facts;
DROP POLICY IF EXISTS "Authenticated users can read mcqs" ON public.mcq_bank;
DROP POLICY IF EXISTS "Authenticated users can read sources" ON public.sources;

-- Recreate policies to allow public (anon) reads for the Lazy Auth flow
CREATE POLICY "Public users can read articles"
  ON public.articles FOR SELECT
  USING (true);

CREATE POLICY "Public users can read facts"
  ON public.facts FOR SELECT
  USING (true);

CREATE POLICY "Public users can read mcqs"
  ON public.mcq_bank FOR SELECT
  USING (true);

CREATE POLICY "Public users can read sources"
  ON public.sources FOR SELECT
  USING (true);
