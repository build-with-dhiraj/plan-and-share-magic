-- ═══════════════════════════════════════════════════════════════
-- PYQ Classification, Matching RPC, Linking Functions + Cron
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. match_pyqs_by_tags — RPC for real-time frontend matching ───
-- Returns published PYQ question IDs that overlap with given gs_papers or syllabus_tags.
-- Ranking: both-overlap > syllabus-only > gs-only; prefers recent years.

CREATE OR REPLACE FUNCTION public.match_pyqs_by_tags(
  p_gs_papers text[] DEFAULT '{}',
  p_syllabus_tags text[] DEFAULT '{}',
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  question_id uuid,
  gs_overlap int,
  syllabus_overlap int,
  combined_score int,
  year int
)
LANGUAGE sql STABLE
AS $$
  SELECT
    q.id AS question_id,
    COALESCE(array_length(
      ARRAY(SELECT unnest(q.gs_papers) INTERSECT SELECT unnest(p_gs_papers)), 1
    ), 0) AS gs_overlap,
    COALESCE(array_length(
      ARRAY(SELECT unnest(q.syllabus_tags) INTERSECT SELECT unnest(p_syllabus_tags)), 1
    ), 0) AS syllabus_overlap,
    -- Combined score: syllabus overlap counts double (more specific)
    COALESCE(array_length(
      ARRAY(SELECT unnest(q.gs_papers) INTERSECT SELECT unnest(p_gs_papers)), 1
    ), 0)
    + 2 * COALESCE(array_length(
      ARRAY(SELECT unnest(q.syllabus_tags) INTERSECT SELECT unnest(p_syllabus_tags)), 1
    ), 0) AS combined_score,
    q.year
  FROM public.pyq_questions q
  WHERE q.is_published = true
    AND (
      q.gs_papers && p_gs_papers
      OR q.syllabus_tags && p_syllabus_tags
    )
  ORDER BY
    -- Prefer questions that match both arrays
    (CASE WHEN q.gs_papers && p_gs_papers AND q.syllabus_tags && p_syllabus_tags THEN 1 ELSE 0 END) DESC,
    -- Then by combined overlap score
    (COALESCE(array_length(
      ARRAY(SELECT unnest(q.gs_papers) INTERSECT SELECT unnest(p_gs_papers)), 1
    ), 0)
    + 2 * COALESCE(array_length(
      ARRAY(SELECT unnest(q.syllabus_tags) INTERSECT SELECT unnest(p_syllabus_tags)), 1
    ), 0)) DESC,
    -- Prefer recent years
    q.year DESC
  LIMIT p_limit;
$$;

-- ─── 2. link_pyqs_for_article — Pre-compute PYQ links for one article ───

CREATE OR REPLACE FUNCTION public.link_pyqs_for_article(p_article_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gs_papers text[];
  v_syllabus_tags text[];
  v_linked int := 0;
  v_match RECORD;
  v_gs_score numeric;
  v_syl_score numeric;
  v_confidence numeric;
  v_link_type text;
BEGIN
  -- Get article's tags
  SELECT gs_papers, syllabus_tags
  INTO v_gs_papers, v_syllabus_tags
  FROM public.articles
  WHERE id = p_article_id;

  -- Skip if article has no tags
  IF v_gs_papers IS NULL AND v_syllabus_tags IS NULL THEN
    RETURN 0;
  END IF;
  IF array_length(v_gs_papers, 1) IS NULL AND array_length(v_syllabus_tags, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Find matching PYQs via the RPC function
  FOR v_match IN
    SELECT * FROM public.match_pyqs_by_tags(
      COALESCE(v_gs_papers, '{}'),
      COALESCE(v_syllabus_tags, '{}'),
      5  -- max 5 PYQs per article
    )
  LOOP
    -- Compute normalized scores
    v_gs_score := CASE
      WHEN array_length(v_gs_papers, 1) > 0
      THEN v_match.gs_overlap::numeric / array_length(v_gs_papers, 1)
      ELSE 0
    END;

    v_syl_score := CASE
      WHEN array_length(v_syllabus_tags, 1) > 0
      THEN v_match.syllabus_overlap::numeric / array_length(v_syllabus_tags, 1)
      ELSE 0
    END;

    -- Combined confidence (weighted average)
    v_confidence := LEAST(1.0, (v_gs_score * 0.3 + v_syl_score * 0.7));
    IF v_confidence < 0.1 THEN
      CONTINUE;
    END IF;

    -- Determine link type
    IF v_match.gs_overlap > 0 AND v_match.syllabus_overlap > 0 THEN
      v_link_type := 'syllabus_overlap';
    ELSIF v_match.syllabus_overlap > 0 THEN
      v_link_type := 'direct_theme_match';
    ELSE
      v_link_type := 'entity_overlap';
    END IF;

    -- Insert link (skip duplicates)
    INSERT INTO public.issue_pyq_links (
      article_id, pyq_question_id, link_type, link_reason,
      confidence_score, gs_overlap_score, syllabus_overlap_score,
      is_published
    )
    VALUES (
      p_article_id, v_match.question_id, v_link_type,
      'Auto-linked: GS overlap=' || v_match.gs_overlap || ', Syllabus overlap=' || v_match.syllabus_overlap,
      v_confidence, v_gs_score, v_syl_score,
      true
    )
    ON CONFLICT (article_id, pyq_question_id) DO NOTHING;

    v_linked := v_linked + 1;
  END LOOP;

  RETURN v_linked;
END;
$$;

-- ─── 3. link_pyqs_for_recent_articles — Batch version for cron ───

CREATE OR REPLACE FUNCTION public.link_pyqs_for_recent_articles(p_hours int DEFAULT 24)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_article RECORD;
  v_total_linked int := 0;
  v_linked int;
BEGIN
  -- Find processed articles from last N hours that don't yet have PYQ links
  FOR v_article IN
    SELECT a.id
    FROM public.articles a
    WHERE a.processed = true
      AND a.upsc_relevance >= 0.3
      AND a.gs_papers IS NOT NULL
      AND array_length(a.gs_papers, 1) > 0
      AND a.ingested_at >= now() - (p_hours || ' hours')::interval
      AND NOT EXISTS (
        SELECT 1 FROM public.issue_pyq_links l
        WHERE l.article_id = a.id
      )
    ORDER BY a.ingested_at DESC
    LIMIT 100  -- safety cap
  LOOP
    v_linked := public.link_pyqs_for_article(v_article.id);
    v_total_linked := v_total_linked + v_linked;
  END LOOP;

  RETURN v_total_linked;
END;
$$;

-- ─── 4. Cron Job: Auto-link PYQs every 6 hours ───

-- Remove existing job if any
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'pipeline_pyq_link';

-- Schedule: 4x/day at 03:00, 09:00, 15:00, 21:00 UTC
SELECT cron.schedule(
  'pipeline_pyq_link',
  '0 3,9,15,21 * * *',
  $$SELECT public.link_pyqs_for_recent_articles(24);$$
);
