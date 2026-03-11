-- ═══════════════════════════════════════════════════════════════
-- Migration: Reduce Layer C (coaching) cron from 4x/day to 1x/day
-- 
-- Rationale: Phase 3b requires url_pattern for Layer C firecrawl
-- sources (fail closed). Most Layer C firecrawl sources lack
-- url_patterns, so 4x/day runs waste compute. RSS sources still
-- work and 1x/day is sufficient for coaching supplementary content.
-- ═══════════════════════════════════════════════════════════════

-- Remove existing Layer C schedule
SELECT cron.unschedule('pipeline_layer_c');

-- Re-schedule: once daily at 02:00 UTC (7:30 AM IST)
SELECT cron.schedule(
  'pipeline_layer_c',
  '0 2 * * *',
  $$SELECT public.trigger_pipeline('C', 5);$$
);
