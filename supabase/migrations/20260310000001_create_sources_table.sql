-- ═══════════════════════════════════════════════════════════════
-- SOURCES TABLE — Content Pipeline Source Registry
-- ═══════════════════════════════════════════════════════════════
-- Replaces hardcoded SOURCE_REGISTRY in ingest-rss edge function
-- and the legacy rss_sources table from Lovable.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('canonical', 'context_media', 'upsc_benchmark', 'global_report')),
  layer TEXT NOT NULL CHECK (layer IN ('A', 'B', 'C', 'D')),
  trust_weight NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  ingest_method TEXT NOT NULL CHECK (ingest_method IN ('rss', 'firecrawl', 'pdf', 'youtube')),
  base_url TEXT,
  feed_urls TEXT[] NOT NULL DEFAULT '{}',
  crawl_frequency_minutes INTEGER NOT NULL DEFAULT 360,
  is_canonical_truth_source BOOLEAN NOT NULL DEFAULT false,
  allow_full_text_storage BOOLEAN NOT NULL DEFAULT false,
  allow_excerpt_only BOOLEAN NOT NULL DEFAULT true,
  legal_risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (legal_risk_level IN ('low', 'medium', 'high')),
  default_tags TEXT[] DEFAULT '{}',
  scrape_selector TEXT,
  url_pattern TEXT,          -- regex to identify valid article URLs from listing pages
  active BOOLEAN NOT NULL DEFAULT true,
  last_crawled_at TIMESTAMPTZ,
  last_error TEXT,
  articles_ingested_total INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_sources_active ON public.sources (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_sources_layer ON public.sources (layer);

-- RLS: allow authenticated read, service role full access
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read sources"
  ON public.sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access to sources"
  ON public.sources FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA — All approved sources from pipeline spec
-- ═══════════════════════════════════════════════════════════════

-- ──────────── LAYER A: CANONICAL / AUTHORITATIVE ────────────

INSERT INTO public.sources (name, label, category, layer, trust_weight, ingest_method, base_url, feed_urls, crawl_frequency_minutes, is_canonical_truth_source, allow_full_text_storage, allow_excerpt_only, legal_risk_level, default_tags, url_pattern, notes) VALUES

-- PIB: RSS feed serves Hindi despite Lang=1, so we use firecrawl on the English page
('pib', 'Press Information Bureau', 'canonical', 'A', 1.00, 'firecrawl',
 'https://pib.gov.in', '{"https://pib.gov.in/AllRel.aspx"}',
 30, true, true, false, 'low', '{"Polity","Economy"}',
 'PressReleaseIframePage', 'PIB RSS returns Hindi only; scrape English press releases page'),

('rbi', 'Reserve Bank of India', 'canonical', 'A', 1.00, 'firecrawl',
 'https://www.rbi.org.in', '{"https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx"}',
 60, true, true, false, 'low', '{"Economy"}',
 'PressReleaseDisplay', 'RBI RSS is broken; scrape press releases page'),

('prs_legislative', 'PRS Legislative Research', 'canonical', 'A', 0.98, 'firecrawl',
 'https://prsindia.org', '{"https://prsindia.org/billtrack","https://prsindia.org/policy/vital-stats"}',
 180, true, true, false, 'low', '{"Polity"}',
 'billtrack|policy|vital-stats', NULL),

('niti_aayog', 'NITI Aayog', 'canonical', 'A', 0.96, 'firecrawl',
 'https://www.niti.gov.in', '{"https://www.niti.gov.in/reports-and-publications"}',
 360, true, true, false, 'low', '{"Economy","Polity"}',
 'reports|publications', NULL),

('india_budget', 'Economic Survey / Union Budget', 'canonical', 'A', 1.00, 'pdf',
 'https://www.indiabudget.gov.in', '{"https://www.indiabudget.gov.in/","https://www.indiabudget.gov.in/economicsurvey/"}',
 1440, true, true, false, 'low', '{"Economy"}',
 NULL, 'Crawl infrequently; mainly useful during budget season'),

('supreme_court', 'Supreme Court of India / eCourts', 'canonical', 'A', 0.95, 'firecrawl',
 'https://main.sci.gov.in', '{"https://main.sci.gov.in/judgments"}',
 360, true, true, false, 'low', '{"Polity"}',
 'judgments|orders', NULL),

('yojana', 'Yojana Magazine', 'canonical', 'A', 0.90, 'firecrawl',
 'https://www.publicationsdivision.nic.in', '{"https://www.publicationsdivision.nic.in/"}',
 1440, true, false, true, 'medium', '{"Economy","Society"}',
 NULL, 'Monthly magazine; excerpt only'),

('kurukshetra', 'Kurukshetra Magazine', 'canonical', 'A', 0.90, 'firecrawl',
 'https://www.publicationsdivision.nic.in', '{"https://www.publicationsdivision.nic.in/"}',
 1440, true, false, true, 'medium', '{"Society"}',
 NULL, 'Monthly magazine; excerpt only'),

('science_reporter', 'Science Reporter (CSIR)', 'canonical', 'A', 0.88, 'firecrawl',
 'https://www.niscpr.res.in', '{"https://www.niscpr.res.in/periodicals/science-reporter"}',
 1440, true, false, true, 'medium', '{"Science"}',
 NULL, 'Monthly; excerpt only'),

('mea', 'Ministry of External Affairs', 'canonical', 'A', 0.95, 'firecrawl',
 'https://www.mea.gov.in', '{"https://www.mea.gov.in/press-releases.htm"}',
 360, true, true, false, 'low', '{"IR"}',
 'press-release|bilateral', NULL),

('moef', 'Ministry of Environment', 'canonical', 'A', 0.93, 'firecrawl',
 'https://moef.gov.in', '{"https://moef.gov.in/en/recent-initiatives/"}',
 360, true, true, false, 'low', '{"Environment"}',
 NULL, NULL),

('isro', 'ISRO Updates', 'canonical', 'A', 0.92, 'firecrawl',
 'https://www.isro.gov.in', '{"https://www.isro.gov.in/UpdatesFromISRO.html"}',
 360, true, true, false, 'low', '{"Science"}',
 NULL, NULL),

-- ──────────── LAYER A: CANONICAL / AUTHORITATIVE ────────────
-- (Kept intact: PIB, RBI, PRS, NITI Aayog, Budget, Supreme Court, Yojana, Kurukshetra, Science Reporter, MEA, MoEF, ISRO)

-- ──────────── LAYER B: CONTEXT / HIGH-QUALITY MEDIA ────────────

('indian_express', 'The Indian Express', 'context_media', 'B', 0.90, 'rss',
 'https://indianexpress.com', '{"https://indianexpress.com/feed/"}',
 30, false, false, true, 'medium', '{}',
 NULL, 'Standard daily feed'),

('livemint', 'LiveMint', 'context_media', 'B', 0.90, 'rss',
 'https://www.livemint.com', '{"https://www.livemint.com/rss/news"}',
 30, false, false, true, 'medium', '{}',
 NULL, 'Economy/Business context'),

('down_to_earth', 'Down To Earth', 'context_media', 'B', 0.88, 'firecrawl',
 'https://www.downtoearth.org.in', '{"https://www.downtoearth.org.in/news"}',
 120, false, false, true, 'medium', '{}',
 NULL, 'Environment focus'),

('business_standard', 'Business Standard', 'context_media', 'B', 0.88, 'rss',
 'https://www.business-standard.com', '{"https://www.business-standard.com/rss/latest-news.xml"}',
 60, false, false, true, 'medium', '{}',
 NULL, 'Economy/Business context'),

('the_hindu', 'The Hindu', 'context_media', 'B', 0.92, 'rss',
 'https://www.thehindu.com', '{"https://www.thehindu.com/feeder/default.rss"}',
 30, false, false, true, 'medium', '{}',
 NULL, 'Primary paper, excerpt only'),

-- ──────────── LAYER C: UPSC BENCHMARK / COACHING (PRIMARY PIPELINE) ────────────

('pw_onlyias_youtube', 'PW OnlyIAS Videos', 'upsc_benchmark', 'C', 0.95, 'youtube',
 'https://www.youtube.com/@OnlyIasnothingelse', '{"https://www.youtube.com/feeds/videos.xml?channel_id=UCvEEQvH2-e2gA_rC5qXq2vA"}',
 120, false, false, true, 'low', '{}',
 NULL, 'Primary source. Video transcripts from PW OnlyIAS'),

('pw_onlyias_daily', 'PW OnlyIAS Daily News', 'upsc_benchmark', 'C', 0.95, 'firecrawl',
 'https://pwonlyias.com', '{"https://pwonlyias.com/daily-news/"}',
 60, false, false, true, 'low', '{}',
 NULL, 'Primary source. Curated daily news from Hindu/Express by PW'),

('pw_onlyias_prelims', 'PW OnlyIAS Prelims Booster', 'upsc_benchmark', 'C', 0.95, 'firecrawl',
 'https://pwonlyias.com', '{"https://pwonlyias.com/prelims-booster/"}',
 120, false, false, true, 'low', '{}',
 NULL, 'Primary source. Targeted prelims facts'),

('pw_onlyias_editorial', 'PW OnlyIAS Editorials', 'upsc_benchmark', 'C', 0.95, 'firecrawl',
 'https://pwonlyias.com', '{"https://pwonlyias.com/editorial-discussion/"}',
 120, false, false, true, 'low', '{}',
 NULL, 'Primary source. Deep analysis and mains angles'),

('drishti_ias', 'Drishti IAS', 'upsc_benchmark', 'C', 0.82, 'rss',
 'https://www.drishtiias.com', '{"https://www.drishtiias.com/rss"}',
 60, false, false, true, 'medium', '{}',
 NULL, 'Secondary benchmark, RSS usage preferred'),

('vision_ias', 'Vision IAS', 'upsc_benchmark', 'C', 0.84, 'firecrawl',
 'https://visionias.in', '{"https://visionias.in/current-affairs/"}',
 120, false, false, true, 'medium', '{}',
 NULL, 'Major UPSC benchmark'),

('forum_ias', 'ForumIAS', 'upsc_benchmark', 'C', 0.82, 'firecrawl',
 'https://forumias.com', '{"https://blog.forumias.com/category/current-affairs"}',
 120, false, false, true, 'medium', '{}',
 NULL, 'Secondary benchmark'),

('insights_ias', 'InsightsIAS', 'upsc_benchmark', 'C', 0.82, 'firecrawl',
 'https://www.insightsonindia.com', '{"https://www.insightsonindia.com/category/secure-2024/"}',
 120, false, false, true, 'medium', '{}',
 NULL, 'Secondary benchmark'),

('superkalam', 'SuperKalam', 'upsc_benchmark', 'C', 0.80, 'firecrawl',
 'https://superkalam.com', '{"https://superkalam.com/"}',
 120, false, false, true, 'medium', '{}',
 NULL, 'Secondary AI benchmark'),

('newsbook_ai', 'NewsbookAI', 'upsc_benchmark', 'C', 0.78, 'firecrawl',
 'https://newsbook.ai', '{"https://newsbook.ai/feed/"}',
 180, false, false, true, 'medium', '{}',
 NULL, 'Secondary benchmark'),

('clear_ias', 'ClearIAS', 'upsc_benchmark', 'C', 0.76, 'firecrawl',
 'https://www.clearias.com', '{"https://www.clearias.com/current-affairs/"}',
 180, false, false, true, 'medium', '{}',
 NULL, 'Secondary benchmark'),

('civilsdaily', 'Civilsdaily', 'upsc_benchmark', 'C', 0.76, 'firecrawl',
 'https://www.civilsdaily.com', '{"https://www.civilsdaily.com/category/current-affairs/"}',
 180, false, false, true, 'medium', '{}',
 NULL, 'Secondary benchmark'),

('iasbaba', 'IASbaba', 'upsc_benchmark', 'C', 0.78, 'firecrawl',
 'https://iasbaba.com', '{"https://iasbaba.com/current-affairs/"}',
 180, false, false, true, 'medium', '{}',
 NULL, 'Secondary benchmark'),

('vajiram_ravi', 'Vajiram & Ravi', 'upsc_benchmark', 'C', 0.80, 'firecrawl',
 'https://vajiramias.com', '{"https://vajiramias.com/current-affairs/"}',
 180, false, false, true, 'medium', '{}',
 NULL, 'Secondary benchmark'),

-- ──────────── LAYER D: GLOBAL REPORTS & INDICES ────────────

('world_bank', 'World Bank India', 'global_report', 'D', 0.94, 'firecrawl',
 'https://www.worldbank.org', '{"https://www.worldbank.org/en/country/india"}',
 1440, true, true, false, 'low', '{"Economy"}',
 NULL, NULL),

('imf_india', 'IMF India', 'global_report', 'D', 0.92, 'firecrawl',
 'https://www.imf.org', '{"https://www.imf.org/en/Countries/IND"}',
 1440, true, true, false, 'low', '{"Economy"}',
 NULL, NULL),

('who_india', 'WHO India', 'global_report', 'D', 0.94, 'firecrawl',
 'https://www.who.int', '{"https://www.who.int/india"}',
 1440, true, true, false, 'low', '{"Science","Society"}',
 NULL, NULL),

('undp_hdr', 'UNDP Human Development Report', 'global_report', 'D', 0.90, 'firecrawl',
 'https://hdr.undp.org', '{"https://hdr.undp.org/"}',
 1440, true, true, false, 'low', '{"Society","Economy"}',
 NULL, NULL),

('wto', 'WTO Trade Reports', 'global_report', 'D', 0.88, 'firecrawl',
 'https://www.wto.org', '{"https://www.wto.org/english/res_e/publications_e/publications_e.htm"}',
 1440, true, true, false, 'low', '{"Economy","IR"}',
 NULL, NULL),

('ipcc', 'IPCC Reports', 'global_report', 'D', 0.90, 'firecrawl',
 'https://www.ipcc.ch', '{"https://www.ipcc.ch/reports/"}',
 1440, true, true, false, 'low', '{"Environment"}',
 NULL, NULL),

('iea', 'IEA Energy Reports', 'global_report', 'D', 0.86, 'firecrawl',
 'https://www.iea.org', '{"https://www.iea.org/countries/india"}',
 1440, true, true, false, 'low', '{"Economy","Environment"}',
 NULL, NULL),

('fao', 'FAO Reports', 'global_report', 'D', 0.86, 'firecrawl',
 'https://www.fao.org', '{"https://www.fao.org/india/en/"}',
 1440, true, true, false, 'low', '{"Economy","Environment"}',
 NULL, NULL),

('unep', 'UNEP Reports', 'global_report', 'D', 0.86, 'firecrawl',
 'https://www.unep.org', '{"https://www.unep.org/"}',
 1440, true, true, false, 'low', '{"Environment"}',
 NULL, NULL),

('un_sdg', 'UN SDG Progress', 'global_report', 'D', 0.84, 'firecrawl',
 'https://sdgs.un.org', '{"https://sdgs.un.org/goals"}',
 1440, true, true, false, 'low', '{"Society","Environment"}',
 NULL, NULL),

('transparency_intl', 'Transparency International CPI', 'global_report', 'D', 0.82, 'firecrawl',
 'https://www.transparency.org', '{"https://www.transparency.org/en/cpi"}',
 1440, true, true, false, 'low', '{"Polity","Ethics"}',
 NULL, NULL),

('global_hunger_index', 'Global Hunger Index', 'global_report', 'D', 0.82, 'firecrawl',
 'https://www.globalhungerindex.org', '{"https://www.globalhungerindex.org/"}',
 1440, true, true, false, 'low', '{"Society"}',
 NULL, NULL),

('rsf_press_freedom', 'RSF Press Freedom Index', 'global_report', 'D', 0.80, 'firecrawl',
 'https://rsf.org', '{"https://rsf.org/en/index"}',
 1440, true, true, false, 'low', '{"Polity","Society"}',
 NULL, NULL);

-- Drop legacy Lovable-era table (not used by any code)
DROP TABLE IF EXISTS public.rss_sources;
