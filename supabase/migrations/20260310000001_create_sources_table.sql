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
  ingest_method TEXT NOT NULL CHECK (ingest_method IN ('rss', 'firecrawl', 'pdf')),
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

-- ──────────── LAYER B: CONTEXT / HIGH-QUALITY MEDIA ────────────

('the_hindu', 'The Hindu', 'context_media', 'B', 0.90, 'rss',
 'https://www.thehindu.com', '{"https://www.thehindu.com/news/national/feeder/default.rss","https://www.thehindu.com/business/Economy/feeder/default.rss","https://www.thehindu.com/sci-tech/science/feeder/default.rss","https://www.thehindu.com/news/international/feeder/default.rss"}',
 30, false, false, true, 'medium', '{}',
 NULL, 'Legal risk: only store headline + AI summary, not full text'),

('indian_express', 'The Indian Express', 'context_media', 'B', 0.90, 'rss',
 'https://indianexpress.com', '{"https://indianexpress.com/section/india/feed/","https://indianexpress.com/section/explained/feed/","https://indianexpress.com/section/opinion/feed/","https://indianexpress.com/section/business/economy/feed/"}',
 30, false, false, true, 'medium', '{}',
 NULL, NULL),

('livemint', 'LiveMint', 'context_media', 'B', 0.90, 'rss',
 'https://www.livemint.com', '{"https://www.livemint.com/rss/economy","https://www.livemint.com/rss/politics","https://www.livemint.com/rss/science"}',
 30, false, false, true, 'medium', '{}',
 NULL, NULL),

('down_to_earth', 'Down To Earth', 'context_media', 'B', 0.88, 'firecrawl',
 'https://www.downtoearth.org.in', '{"https://www.downtoearth.org.in/environment","https://www.downtoearth.org.in/science-technology"}',
 120, false, false, true, 'medium', '{"Environment"}',
 NULL, 'RSS feed broken (404); use firecrawl'),

('business_standard', 'Business Standard', 'context_media', 'B', 0.88, 'firecrawl',
 'https://www.business-standard.com', '{"https://www.business-standard.com/economy","https://www.business-standard.com/politics"}',
 120, false, false, true, 'medium', '{"Economy"}',
 NULL, 'RSS returns 403; use firecrawl'),

('bbc_india', 'BBC India', 'context_media', 'B', 0.85, 'rss',
 'https://www.bbc.com', '{"https://feeds.bbci.co.uk/news/world/asia/india/rss.xml"}',
 60, false, false, true, 'low', '{"IR"}',
 NULL, NULL),

('the_wire', 'The Wire', 'context_media', 'B', 0.85, 'firecrawl',
 'https://thewire.in', '{"https://thewire.in/government","https://thewire.in/economy","https://thewire.in/environment"}',
 120, false, false, true, 'medium', '{}',
 NULL, 'RSS feed returns HTML; use firecrawl'),

('scroll', 'Scroll.in', 'context_media', 'B', 0.82, 'firecrawl',
 'https://scroll.in', '{"https://scroll.in/latest"}',
 120, false, false, true, 'medium', '{}',
 NULL, 'RSS feed 404; use firecrawl'),

('epw', 'Economic & Political Weekly', 'context_media', 'B', 0.88, 'firecrawl',
 'https://www.epw.in', '{"https://www.epw.in/"}',
 360, false, false, true, 'medium', '{"Economy","Society"}',
 NULL, NULL),

('frontline', 'Frontline', 'context_media', 'B', 0.85, 'firecrawl',
 'https://frontline.thehindu.com', '{"https://frontline.thehindu.com/"}',
 360, false, false, true, 'medium', '{}',
 NULL, NULL),

-- ──────────── LAYER C: UPSC BENCHMARK / COACHING ────────────

('drishti_ias', 'Drishti IAS', 'upsc_benchmark', 'C', 0.82, 'firecrawl',
 'https://www.drishtiias.com', '{"https://www.drishtiias.com/current-affairs-news-analysis-editorials"}',
 60, false, false, true, 'medium', '{}',
 'current-affairs|news-analysis', 'No RSS available; scrape daily news page'),

('vision_ias', 'Vision IAS', 'upsc_benchmark', 'C', 0.84, 'firecrawl',
 'https://visionias.in', '{"https://visionias.in/resources/current-affairs"}',
 120, false, false, true, 'medium', '{}',
 NULL, NULL),

('forumias', 'ForumIAS', 'upsc_benchmark', 'C', 0.82, 'firecrawl',
 'https://forumias.com', '{"https://forumias.com/blog/"}',
 120, false, false, true, 'medium', '{}',
 NULL, NULL),

('insights_ias', 'InsightsIAS', 'upsc_benchmark', 'C', 0.82, 'firecrawl',
 'https://www.insightsonindia.com', '{"https://www.insightsonindia.com/category/current-affairs/"}',
 120, false, false, true, 'medium', '{}',
 NULL, NULL),

('iasbaba', 'IAS Baba', 'upsc_benchmark', 'C', 0.80, 'firecrawl',
 'https://iasbaba.com', '{"https://iasbaba.com/current-affairs-for-ias-upsc-exams/"}',
 120, false, false, true, 'medium', '{}',
 NULL, NULL),

('superkalam', 'SuperKalam', 'upsc_benchmark', 'C', 0.80, 'firecrawl',
 'https://superkalam.com', '{"https://superkalam.com/"}',
 120, false, false, true, 'medium', '{}',
 NULL, NULL),

('newsbookai', 'NewsbookAI', 'upsc_benchmark', 'C', 0.78, 'firecrawl',
 'https://newsbookai.com', '{"https://newsbookai.com/"}',
 180, false, false, true, 'medium', '{}',
 NULL, NULL),

('clearias', 'ClearIAS', 'upsc_benchmark', 'C', 0.76, 'firecrawl',
 'https://www.clearias.com', '{"https://www.clearias.com/current-affairs/"}',
 180, false, false, true, 'medium', '{}',
 NULL, NULL),

('civilsdaily', 'CivilsDaily', 'upsc_benchmark', 'C', 0.76, 'firecrawl',
 'https://www.civilsdaily.com', '{"https://www.civilsdaily.com/"}',
 180, false, false, true, 'medium', '{}',
 NULL, NULL),

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
