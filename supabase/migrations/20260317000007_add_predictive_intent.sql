-- Add predictive_intent column to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS predictive_intent jsonb DEFAULT NULL;

-- Create an index to improve search/filtering on JSONB keys
CREATE INDEX IF NOT EXISTS idx_articles_predictive_intent ON articles USING gin (predictive_intent);

COMMENT ON COLUMN articles.predictive_intent IS 'AI-generated proactive insights including foundation bridges and likely confusion points.';
