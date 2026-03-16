-- Fix 1: Update PW YouTube channel ID (was returning 404)
UPDATE public.sources
SET feed_urls = ARRAY['https://www.youtube.com/feeds/videos.xml?channel_id=UCh4f3NyOzqGwZfwTSX78QfQ'],
    last_error = NULL
WHERE name = 'pw_youtube';

-- Fix 2: Backfill published_at with ingested_at for articles that have null published_at
UPDATE public.articles
SET published_at = ingested_at
WHERE published_at IS NULL;
