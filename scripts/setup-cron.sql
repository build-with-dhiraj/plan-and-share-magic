-- ============================================
-- UPSC Daily — pg_cron Pipeline Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- Remove any old cron jobs first
SELECT cron.unschedule('upsc-pipeline-trigger')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'upsc-pipeline-trigger');

-- Schedule pipeline every 6 hours
-- This calls the pipeline-trigger edge function which:
-- 1. Ingests new RSS articles
-- 2. Processes unprocessed articles through the Drishti pipeline
SELECT cron.schedule(
  'upsc-pipeline-trigger',
  '0 */6 * * *',  -- Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
  $$
  SELECT net.http_post(
    url := 'https://ligyvjuwvjeiiywxgewy.supabase.co/functions/v1/pipeline-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ3l2anV3dmplaWl5d3hnZXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MTIwNCwiZXhwIjoyMDg4NjE3MjA0fQ.WuAx27B5coblf6sIOB3pooxpd24v093uTS3LmyWwgRI'
    ),
    body := '{"batch_size": 15}'::jsonb
  );
  $$
);

-- Verify the cron job was created
SELECT jobid, schedule, command, jobname FROM cron.job WHERE jobname = 'upsc-pipeline-trigger';
