-- Add hyperlinked_terms column to articles table
-- Stores AI-extracted UPSC terms for auto-hyperlinking in the frontend
-- Format: [{"term": "Bharatiya Nyaya Sanhita", "slug": "bharatiya-nyaya-sanhita"}]

ALTER TABLE articles ADD COLUMN IF NOT EXISTS hyperlinked_terms jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN articles.hyperlinked_terms IS 'AI-extracted UPSC terms for auto-hyperlinking. Array of {term, slug} objects.';
