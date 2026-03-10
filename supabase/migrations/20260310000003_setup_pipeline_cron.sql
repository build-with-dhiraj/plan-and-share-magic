-- ═══════════════════════════════════════════════════════════════
-- Migration: Auto-triggering pipeline via pg_cron + pg_net
--
-- Schedule:
--   Layer A + B → every 4 hours (6x/day)  — covers government + media
--   Layer C     → every 6 hours (4x/day)  — coaching sources
--   Layer D     → weekly on Monday 6AM IST — global reports
--   Process     → every 2 hours           — AI processing backlog
-- ═══════════════════════════════════════════════════════════════

-- Clean up any existing pipeline cron jobs
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname LIKE 'pipeline_%';

-- ─── Helper: wrapper function that calls edge functions via pg_net ───
CREATE OR REPLACE FUNCTION public.trigger_pipeline(
  p_layer text DEFAULT NULL,
  p_max_sources int DEFAULT 5,
  p_method text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text;
  v_body jsonb;
  v_service_key text;
BEGIN
  v_url := current_setting('app.settings.supabase_url', true)
           || '/functions/v1/pipeline-trigger';

  -- Fallback: construct URL from project ref
  IF v_url IS NULL OR v_url = '' OR v_url = '/functions/v1/pipeline-trigger' THEN
    v_url := 'https://ligyvjuwvjeiiywxgewy.supabase.co/functions/v1/pipeline-trigger';
  END IF;

  v_service_key := current_setting('app.settings.service_role_key', true);
  IF v_service_key IS NULL OR v_service_key = '' THEN
    v_service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ3l2anV3dmplaWl5d3hnZXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MTIwNCwiZXhwIjoyMDg4NjE3MjA0fQ.WuAx27B5coblf6sIOB3pooxpd24v093uTS3LmyWwgRI';
  END IF;

  v_body := jsonb_build_object('max_sources', p_max_sources);
  IF p_layer IS NOT NULL THEN
    v_body := v_body || jsonb_build_object('layer', p_layer);
  END IF;
  IF p_method IS NOT NULL THEN
    v_body := v_body || jsonb_build_object('method', p_method);
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type', 'application/json'
    ),
    body := v_body
  );
END;
$$;

-- ─── Helper: process-content caller ───
CREATE OR REPLACE FUNCTION public.trigger_process_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text;
  v_service_key text;
BEGIN
  v_url := 'https://ligyvjuwvjeiiywxgewy.supabase.co/functions/v1/process-content';
  v_service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ3l2anV3dmplaWl5d3hnZXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MTIwNCwiZXhwIjoyMDg4NjE3MjA0fQ.WuAx27B5coblf6sIOB3pooxpd24v093uTS3LmyWwgRI';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('batch_size', 5)
  );
END;
$$;

-- ═══════════════════════════════════════════
-- CRON SCHEDULES (all times UTC)
-- IST = UTC + 5:30
-- ═══════════════════════════════════════════

-- Layer A+B RSS: Every 4 hours starting at 00:30 UTC (6:00 AM IST)
-- Covers The Hindu, Indian Express, Mint, BBC, PIB, RBI etc.
SELECT cron.schedule(
  'pipeline_layer_ab_rss',
  '30 0,4,8,12,16,20 * * *',
  $$SELECT public.trigger_pipeline('A', 5, 'rss'); SELECT public.trigger_pipeline('B', 5, 'rss');$$
);

-- Layer A+B Firecrawl: Every 6 hours starting at 01:00 UTC
-- Covers scrape-only sources (DTE, Scroll, Wire, EPW, gov sites)
SELECT cron.schedule(
  'pipeline_layer_ab_scrape',
  '0 1,7,13,19 * * *',
  $$SELECT public.trigger_pipeline('A', 3, 'firecrawl'); SELECT public.trigger_pipeline('B', 3, 'firecrawl');$$
);

-- Layer C (coaching): Every 6 hours at 02:00 UTC
SELECT cron.schedule(
  'pipeline_layer_c',
  '0 2,8,14,20 * * *',
  $$SELECT public.trigger_pipeline('C', 5);$$
);

-- Layer D (global reports): Weekly on Monday at 01:30 UTC (7:00 AM IST)
SELECT cron.schedule(
  'pipeline_layer_d',
  '30 1 * * 1',
  $$SELECT public.trigger_pipeline('D', 5);$$
);

-- AI Processing: Every 2 hours — processes 5 unprocessed articles per run
SELECT cron.schedule(
  'pipeline_process',
  '15 */2 * * *',
  $$SELECT public.trigger_process_content();$$
);

-- Extra processing run during peak India hours (7-9 AM IST = 1:30-3:30 UTC)
-- to ensure fresh content is ready for morning users
SELECT cron.schedule(
  'pipeline_process_morning',
  '45 1,2,3 * * *',
  $$SELECT public.trigger_process_content();$$
);
