-- pg_cron auto-pipeline: runs every 6 hours (4x daily)
-- Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor)
-- This is NOT a migration — it contains project-specific URLs/keys

-- Make sure pg_cron and pg_net extensions are enabled first:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'content-pipeline-6h',
  '0 */6 * * *',
  $$SELECT net.http_post(
    url := 'https://zblmdfoddvqlaadqhlkq.supabase.co/functions/v1/pipeline-trigger',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
    body := '{"batch_size":20}'::jsonb
  )$$
);

-- To verify it's scheduled:
-- SELECT * FROM cron.job;

-- To remove the schedule if needed:
-- SELECT cron.unschedule('content-pipeline-6h');
