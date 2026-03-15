-- ═══════════════════════════════════════════════════════════════
-- CONTENT SOURCE OVERHAUL — Focus on 4 primary sources
-- ═══════════════════════════════════════════════════════════════
-- Deactivate all 43 existing sources.
-- Insert 4 new focused sources: PW Only IAS, Drishti IAS,
-- SuperKalam, and PW YouTube.
-- Existing articles are preserved (not deleted).
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Deactivate all existing sources
UPDATE public.sources SET active = false WHERE active = true;

-- Step 2: Insert 4 new focused sources

-- PW Only IAS — WordPress RSS feed, primary current affairs source
INSERT INTO public.sources (
  name, label, category, layer, trust_weight, ingest_method,
  base_url, feed_urls, crawl_frequency_minutes,
  is_canonical_truth_source, allow_full_text_storage, allow_excerpt_only,
  legal_risk_level, default_tags, url_pattern, notes, active
) VALUES (
  'pw_only_ias', 'PW Only IAS', 'upsc_benchmark', 'A', 0.90, 'rss',
  'https://pwonlyias.com', '{"https://pwonlyias.com/feed/"}',
  120, false, false, true, 'medium', '{}',
  NULL, 'WordPress RSS 2.0 feed. Primary current affairs source.',
  true
);

-- Drishti IAS — Benchmark coaching source, firecrawl
INSERT INTO public.sources (
  name, label, category, layer, trust_weight, ingest_method,
  base_url, feed_urls, crawl_frequency_minutes,
  is_canonical_truth_source, allow_full_text_storage, allow_excerpt_only,
  legal_risk_level, default_tags, url_pattern, notes, active
) VALUES (
  'drishti_ias_v2', 'Drishti IAS', 'upsc_benchmark', 'A', 0.85, 'firecrawl',
  'https://www.drishtiias.com', '{"https://www.drishtiias.com/current-affairs-news-analysis-editorials"}',
  120, false, false, true, 'medium', '{}',
  'current-affairs|daily-updates|news-analysis', 'Benchmark UPSC coaching source. Scrape daily news analysis.',
  true
);

-- SuperKalam — Supplement coaching source, firecrawl
INSERT INTO public.sources (
  name, label, category, layer, trust_weight, ingest_method,
  base_url, feed_urls, crawl_frequency_minutes,
  is_canonical_truth_source, allow_full_text_storage, allow_excerpt_only,
  legal_risk_level, default_tags, url_pattern, notes, active
) VALUES (
  'superkalam_v2', 'SuperKalam', 'upsc_benchmark', 'A', 0.80, 'firecrawl',
  'https://superkalam.com', '{"https://superkalam.com/current-affairs/"}',
  120, false, false, true, 'medium', '{}',
  'current-affairs|articles', 'Supplementary current affairs. No RSS — scrape listing page.',
  true
);

-- PW YouTube — Video transcripts via YouTube RSS
-- YouTube channels have RSS at: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
-- PW Only IAS channel: @OnlyIasnothingelse
INSERT INTO public.sources (
  name, label, category, layer, trust_weight, ingest_method,
  base_url, feed_urls, crawl_frequency_minutes,
  is_canonical_truth_source, allow_full_text_storage, allow_excerpt_only,
  legal_risk_level, default_tags, url_pattern, notes, active
) VALUES (
  'pw_youtube', 'PW YouTube', 'upsc_benchmark', 'A', 0.82, 'rss',
  'https://www.youtube.com', '{"https://www.youtube.com/feeds/videos.xml?channel_id=UC5V4Iy06NF-q2jUZ20MERBQ"}',
  240, false, false, true, 'low', '{}',
  NULL, 'YouTube RSS for PW Only IAS channel. Videos will be scraped via Jina for transcript.',
  true
);

-- Step 3: Simplify cron schedule — 2 jobs instead of complex rotation
-- Remove old cron jobs and add simple ones (if pg_cron extension is available)
DO $$
BEGIN
  -- Try to remove old jobs
  PERFORM cron.unschedule('ingest-layer-a');
  PERFORM cron.unschedule('ingest-layer-b');
  PERFORM cron.unschedule('ingest-layer-c');
  PERFORM cron.unschedule('ingest-layer-d');
  PERFORM cron.unschedule('process-content');
  PERFORM cron.unschedule('pipeline-trigger');
EXCEPTION WHEN OTHERS THEN
  -- pg_cron may not have these jobs or extension may not exist
  NULL;
END $$;

-- Schedule new simplified cron (every 2 hours ingest, every 2 hours process)
-- Use $outer$ tagged quoting to avoid conflict with inner $$ in cron.schedule
DO $outer$
BEGIN
  PERFORM cron.schedule(
    'ingest-all-sources',
    '15 */2 * * *',
    $$SELECT net.http_post(
      url := 'https://ligyvjuwvjeiiywxgewy.supabase.co/functions/v1/ingest-rss',
      headers := jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ3l2anV3dmplaWl5d3hnZXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MTIwNCwiZXhwIjoyMDg4NjE3MjA0fQ.WuAx27B5coblf6sIOB3pooxpd24v093uTS3LmyWwgRI',
        'Content-Type', 'application/json'
      ),
      body := '{"force_all": true}'::jsonb
    )$$
  );

  PERFORM cron.schedule(
    'process-content-all',
    '45 */2 * * *',
    $$SELECT net.http_post(
      url := 'https://ligyvjuwvjeiiywxgewy.supabase.co/functions/v1/process-content',
      headers := jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ3l2anV3dmplaWl5d3hnZXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MTIwNCwiZXhwIjoyMDg4NjE3MjA0fQ.WuAx27B5coblf6sIOB3pooxpd24v093uTS3LmyWwgRI',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    )$$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling failed: %. Manual cron setup may be needed.', SQLERRM;
END $outer$;
