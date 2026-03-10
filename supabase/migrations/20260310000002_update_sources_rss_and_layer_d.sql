-- ═══════════════════════════════════════════════════════════════
-- Migration: Switch JS-heavy sites to RSS, fix Layer D sources
-- ═══════════════════════════════════════════════════════════════

-- ─── JS-heavy coaching sites → switch to RSS (WordPress feeds) ───

UPDATE sources SET
  ingest_method = 'rss',
  feed_urls = ARRAY['https://forumias.com/blog/feed/'],
  last_error = NULL
WHERE name = 'forumias';

UPDATE sources SET
  ingest_method = 'rss',
  feed_urls = ARRAY['https://www.insightsonindia.com/feed/'],
  last_error = NULL
WHERE name = 'insights_ias';

UPDATE sources SET
  ingest_method = 'rss',
  feed_urls = ARRAY['https://iasbaba.com/feed/'],
  last_error = NULL
WHERE name = 'iasbaba';

-- CivilsDaily RSS is broken (500), keep firecrawl but improve URL
UPDATE sources SET
  feed_urls = ARRAY['https://www.civilsdaily.com/current-affairs/'],
  url_pattern = 'civilsdaily.com/.+/.+',
  last_error = NULL
WHERE name = 'civilsdaily';

-- Down To Earth: RSS broken, keep firecrawl with better listing pages
UPDATE sources SET
  feed_urls = ARRAY[
    'https://www.downtoearth.org.in/environment',
    'https://www.downtoearth.org.in/climate-change',
    'https://www.downtoearth.org.in/wildlife-biodiversity'
  ],
  url_pattern = 'downtoearth.org.in/.+/.*\d{5,}',
  last_error = NULL
WHERE name = 'down_to_earth';

-- ─── Layer D: Switch to RSS where feeds exist ───

UPDATE sources SET
  ingest_method = 'rss',
  feed_urls = ARRAY['https://www.who.int/rss-feeds/news-english.xml'],
  crawl_frequency_minutes = 1440,
  last_error = NULL
WHERE name = 'who_india';

UPDATE sources SET
  ingest_method = 'rss',
  feed_urls = ARRAY['https://www.unep.org/rss.xml'],
  crawl_frequency_minutes = 1440,
  last_error = NULL
WHERE name = 'unep';

-- ─── Layer D: Improve firecrawl sources with better URLs & patterns ───

-- IMF: Use the news/press releases page instead of country page
UPDATE sources SET
  feed_urls = ARRAY['https://www.imf.org/en/News/SearchNews#sort=date-descending'],
  url_pattern = 'imf.org/en/News/Articles',
  crawl_frequency_minutes = 10080,
  last_error = NULL
WHERE name = 'imf_india';

-- World Bank: Use India news page
UPDATE sources SET
  feed_urls = ARRAY['https://www.worldbank.org/en/country/india/news/all'],
  url_pattern = 'worldbank.org/en/.+/news/.+/\d{4}',
  crawl_frequency_minutes = 10080,
  last_error = NULL
WHERE name = 'world_bank';

-- FAO: Use India country page
UPDATE sources SET
  feed_urls = ARRAY['https://www.fao.org/india/news/en/'],
  url_pattern = 'fao.org/.+/detail',
  crawl_frequency_minutes = 10080,
  last_error = NULL
WHERE name = 'fao';

-- IPCC: Reports page (very infrequent)
UPDATE sources SET
  crawl_frequency_minutes = 43200,
  last_error = NULL
WHERE name = 'ipcc';

-- WTO: Use trade topics page
UPDATE sources SET
  feed_urls = ARRAY['https://www.wto.org/english/news_e/news_e.htm'],
  url_pattern = 'wto.org/english/news_e/.*\d{2,}',
  crawl_frequency_minutes = 10080,
  last_error = NULL
WHERE name = 'wto';

-- UNDP HDR: Reports page (annual)
UPDATE sources SET
  crawl_frequency_minutes = 43200,
  last_error = NULL
WHERE name = 'undp_hdr';

-- IEA: Country page for India
UPDATE sources SET
  crawl_frequency_minutes = 10080,
  last_error = NULL
WHERE name = 'iea';

-- Transparency International: CPI page (annual)
UPDATE sources SET
  crawl_frequency_minutes = 43200,
  last_error = NULL
WHERE name = 'transparency_intl';

-- RSF: Index page (annual)
UPDATE sources SET
  crawl_frequency_minutes = 43200,
  last_error = NULL
WHERE name = 'rsf_press_freedom';

-- Global Hunger Index (annual)
UPDATE sources SET
  crawl_frequency_minutes = 43200,
  last_error = NULL
WHERE name = 'global_hunger_index';

-- UN SDG: Goals page
UPDATE sources SET
  crawl_frequency_minutes = 10080,
  last_error = NULL
WHERE name = 'un_sdg';

-- ─── Layer A: Fix broken government sources with better URLs ───

-- PRS Legislative: Use bills tracker
UPDATE sources SET
  feed_urls = ARRAY['https://prsindia.org/billtrack'],
  url_pattern = 'prsindia.org/billtrack/.+',
  last_error = NULL
WHERE name = 'prs_legislative';

-- NITI Aayog: Use reports page
UPDATE sources SET
  feed_urls = ARRAY['https://www.niti.gov.in/reports'],
  url_pattern = 'niti.gov.in/.+',
  last_error = NULL
WHERE name = 'niti_aayog';

-- ISRO: Use news page
UPDATE sources SET
  feed_urls = ARRAY['https://www.isro.gov.in/ISRO_EN/Spacecraft.html'],
  url_pattern = 'isro.gov.in/.+\\.html',
  last_error = NULL
WHERE name = 'isro';

-- MoEF: Use media corner
UPDATE sources SET
  feed_urls = ARRAY['https://moef.gov.in/en/media-corner/'],
  url_pattern = 'moef.gov.in/.+',
  last_error = NULL
WHERE name = 'moef';
