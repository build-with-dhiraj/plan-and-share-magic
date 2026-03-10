import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════
// Junk / error page detection
// ═══════════════════════════════════════════
const JUNK_TITLE_PATTERNS = [
  /^404\b/i, /not\s*found/i, /^403\b/i, /^401\b/i, /^500\b/i,
  /access\s*denied/i, /forbidden/i, /page\s*(not|unavailable)/i,
  /error\s*page/i, /server\s*error/i, /sorry.*inconvenience/i,
  /under\s*maintenance/i, /coming\s*soon/i, /^\s*$/, /^untitled$/i,
  /^just a moment/i, /^attention required/i, /^please wait/i,
  /cloudflare/i, /captcha/i, /blocked/i,
];

function isJunkTitle(title: string): boolean {
  if (!title || title.trim().length < 5) return true;
  return JUNK_TITLE_PATTERNS.some((p) => p.test(title.trim()));
}

function isJunkContent(content: string | null): boolean {
  if (!content) return false;
  const lower = content.toLowerCase();
  if (lower.includes("404 not found") || lower.includes("page not found")) return true;
  if (lower.includes("access denied") || lower.includes("403 forbidden")) return true;
  if (lower.includes("enable javascript") && content.length < 500) return true;
  return false;
}

// ═══════════════════════════════════════════
// XML helpers for RSS parsing
// ═══════════════════════════════════════════
function extractTag(xml: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`
  );
  const m = xml.match(re);
  return (m?.[1] ?? m?.[2] ?? "").trim();
}

function extractItems(xml: string): string[] {
  const items: string[] = [];
  let idx = 0;
  while (true) {
    const start = xml.indexOf("<item", idx);
    if (start === -1) break;
    const end = xml.indexOf("</item>", start);
    if (end === -1) break;
    items.push(xml.substring(start, end + 7));
    idx = end + 7;
  }
  // Also handle Atom <entry> format
  if (items.length === 0) {
    idx = 0;
    while (true) {
      const start = xml.indexOf("<entry", idx);
      if (start === -1) break;
      const end = xml.indexOf("</entry>", start);
      if (end === -1) break;
      items.push(xml.substring(start, end + 8));
      idx = end + 8;
    }
  }
  return items;
}

// ═══════════════════════════════════════════
// HTML entity decoder
// ═══════════════════════════════════════════
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, n) => String.fromCharCode(parseInt(n, 16)));
}

// ═══════════════════════════════════════════
// Native HTML scraper (free, no API key needed)
// ═══════════════════════════════════════════
async function nativeScrape(
  url: string
): Promise<{ text: string; title: string; links: string[] } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;

    const html = await resp.text();
    if (html.length < 200) return null;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = decodeEntities(titleMatch?.[1] ?? "").trim();

    // Extract all links
    const links: string[] = [];
    const linkRegex = /<a[^>]+href=["']([^"'#]+)["']/gi;
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      let href = m[1].trim();
      // Make relative URLs absolute
      if (href.startsWith("/")) {
        try {
          const base = new URL(url);
          href = `${base.protocol}//${base.host}${href}`;
        } catch {
          continue;
        }
      }
      if (href.startsWith("http")) links.push(href);
    }

    // Extract main content — strip non-content elements, then strip tags
    let content = html;
    // Remove script, style, nav, header, footer, sidebar
    content = content.replace(/<script[\s\S]*?<\/script>/gi, "");
    content = content.replace(/<style[\s\S]*?<\/style>/gi, "");
    content = content.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    content = content.replace(/<header[\s\S]*?<\/header>/gi, "");
    content = content.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    content = content.replace(/<aside[\s\S]*?<\/aside>/gi, "");
    content = content.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
    content = content.replace(/<!--[\s\S]*?-->/g, "");

    // Try to find article-specific content
    const articleMatch =
      content.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      content.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
      content.match(
        /<div[^>]*class="[^"]*(?:article|content|post|entry|story)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      );

    if (articleMatch) {
      content = articleMatch[1] || articleMatch[0];
    }

    // Convert some HTML to markdown-like text
    let text = content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " ") // strip remaining tags
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    text = decodeEntities(text);

    // If text is too short, likely a JS-rendered page
    if (text.length < 100) return null;

    return { text, title, links: [...new Set(links)] };
  } catch (e) {
    console.error(`nativeScrape error for ${url}:`, e);
    return null;
  }
}

// ═══════════════════════════════════════════
// Firecrawl scraper (premium, needs API key)
// ═══════════════════════════════════════════
async function scrapeWithFirecrawl(
  url: string,
  firecrawlKey: string
): Promise<{ markdown: string; title?: string } | null> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.error(`Firecrawl error for ${url}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      markdown: data?.data?.markdown || data?.markdown || "",
      title: data?.data?.metadata?.title || data?.metadata?.title || undefined,
    };
  } catch (e) {
    console.error(`Firecrawl exception for ${url}:`, e);
    return null;
  }
}

// ═══════════════════════════════════════════
// Jina AI Reader (free, handles JS rendering)
// Improved: JSON API, 20s timeout, 1 retry
// ═══════════════════════════════════════════
async function scrapeWithJina(
  url: string,
  retries = 1
): Promise<{ text: string; title?: string; links: string[] } | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        // Backoff: wait 2s before retry
        await new Promise((r) => setTimeout(r, 2000));
        console.log(`Jina retry ${attempt} for ${url}`);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const resp = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          Accept: "application/json",
          "X-No-Cache": "true",
          "X-Return-Format": "markdown",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        console.error(`Jina error for ${url}: ${resp.status}`);
        if (attempt < retries) continue;
        return null;
      }

      // Try JSON response first (structured data)
      const raw = await resp.text();
      let title: string | undefined;
      let markdown = "";
      const links: string[] = [];

      try {
        const json = JSON.parse(raw);
        const data = json.data || json;
        title = data.title || undefined;
        markdown = data.content || data.markdown || data.text || "";
        // Extract links from JSON response if available
        if (data.links && Array.isArray(data.links)) {
          for (const l of data.links) {
            const href = typeof l === "string" ? l : l?.href || l?.url;
            if (href?.startsWith("http")) links.push(href);
          }
        }
      } catch {
        // Fallback: parse as plain text (old format)
        markdown = raw;
        const titleMatch = raw.match(/^Title:\s*(.+)$/m);
        title = titleMatch?.[1]?.trim();
        const mdStart = raw.indexOf("Markdown Content:");
        if (mdStart >= 0) markdown = raw.substring(mdStart + 17).trim();
      }

      if (!markdown || markdown.length < 100) {
        if (attempt < retries) continue;
        return null;
      }

      // Extract links from markdown [text](url)
      const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
      let m;
      while ((m = linkRegex.exec(markdown)) !== null) {
        const href = m[2].trim();
        if (href.startsWith("http")) links.push(href);
      }

      return {
        text: markdown,
        title,
        links: [...new Set(links)],
      };
    } catch (e) {
      console.error(`Jina attempt ${attempt} exception for ${url}:`, e);
      if (attempt >= retries) return null;
    }
  }
  return null;
}

// ═══════════════════════════════════════════
// Unified scrape: Firecrawl → Native (fast for articles)
// Note: Jina is reserved for listing page discovery only
// since it's slow (~15s/call) and would timeout the function
// ═══════════════════════════════════════════
async function scrapeArticle(
  url: string,
  firecrawlKey: string
): Promise<{ text: string; title?: string } | null> {
  // 1. Try Firecrawl first if key is available (premium quality)
  if (firecrawlKey) {
    const result = await scrapeWithFirecrawl(url, firecrawlKey);
    if (result?.markdown && result.markdown.length > 100) {
      return { text: result.markdown, title: result.title };
    }
  }
  // 2. Native scrape (free, fast — works for most article pages)
  const native = await nativeScrape(url);
  if (native?.text && native.text.length > 100) {
    return { text: native.text, title: native.title };
  }
  // 3. Last resort: Jina Reader (slow but handles JS-rendered articles)
  const jina = await scrapeWithJina(url);
  if (jina?.text && jina.text.length > 100) {
    return { text: jina.text, title: jina.title };
  }
  return null;
}

// Fast scrape: Firecrawl → Native → optional Jina (when useJina=true for JS-heavy)
async function scrapeArticleFast(
  url: string,
  firecrawlKey: string,
  useJina = false
): Promise<{ text: string; title?: string } | null> {
  if (firecrawlKey) {
    const result = await scrapeWithFirecrawl(url, firecrawlKey);
    if (result?.markdown && result.markdown.length > 100) {
      return { text: result.markdown, title: result.title };
    }
  }
  const native = await nativeScrape(url);
  if (native?.text && native.text.length > 100) {
    return { text: native.text, title: native.title };
  }
  // For JS-heavy sources, fall back to Jina (slower but handles SPA/JS sites)
  if (useJina) {
    const jina = await scrapeWithJina(url, 0); // no retry for batch speed
    if (jina?.text && jina.text.length > 100) {
      return { text: jina.text, title: jina.title };
    }
  }
  return null;
}

// Known JS-heavy domains that need Jina for article scraping
const JS_HEAVY_DOMAINS = [
  "downtoearth.org",
  "forumias.com",
  "insightsonindia.com",
  "civilsdaily.com",
  "iasbaba.com",
  "iea.org",
  "imf.org",
  "worldbank.org",
  "transparency.org",
  "rsf.org",
];

function isJsHeavy(url: string): boolean {
  const lower = url.toLowerCase();
  return JS_HEAVY_DOMAINS.some((d) => lower.includes(d));
}

// ═══════════════════════════════════════════
// Discover article links from a listing page
// ═══════════════════════════════════════════
async function discoverArticleUrls(
  listingUrl: string,
  baseUrl: string,
  urlPattern: string | null,
  firecrawlKey: string
): Promise<string[]> {
  // Try native scrape first (free, fast)
  let rawLinks: string[] = [];

  const page = await nativeScrape(listingUrl);
  if (page?.links && page.links.length > 0) {
    rawLinks = page.links;
  } else {
    // Fallback to Jina Reader for JS-rendered listing pages
    const jina = await scrapeWithJina(listingUrl);
    if (jina?.links && jina.links.length > 0) {
      rawLinks = jina.links;
    }
  }

  if (rawLinks.length === 0) return [];

  // Filter to same-domain article-like URLs
  const baseDomain = (() => {
    try {
      return new URL(baseUrl || listingUrl).hostname.replace("www.", "");
    } catch {
      return "";
    }
  })();

  const articleUrls = rawLinks.filter((link) => {
    try {
      const u = new URL(link);
      // Must be same domain
      if (!u.hostname.replace("www.", "").includes(baseDomain)) return false;
      // Must have a path
      if (u.pathname === "/" || u.pathname === "") return false;
      // Skip non-article resources
      if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|pdf|zip|xml)$/i.test(link)) return false;
      // Skip common nav/utility paths
      if (
        /\/(tag|tags|category|categories|author|login|register|about|contact|privacy|terms|sitemap|feed|rss|search|archive)\b/i.test(
          link
        )
      )
        return false;
      // Apply urlPattern filter if provided
      if (urlPattern) {
        const re = new RegExp(urlPattern, "i");
        if (!re.test(link)) return false;
      }
      return true;
    } catch {
      return false;
    }
  });

  return [...new Set(articleUrls)];
}

// ═══════════════════════════════════════════
// Source type from DB
// ═══════════════════════════════════════════
interface DBSource {
  id: string;
  name: string;
  label: string;
  category: string;
  layer: string;
  trust_weight: number;
  ingest_method: string;
  base_url: string | null;
  feed_urls: string[];
  crawl_frequency_minutes: number;
  is_canonical_truth_source: boolean;
  allow_full_text_storage: boolean;
  allow_excerpt_only: boolean;
  legal_risk_level: string;
  default_tags: string[];
  scrape_selector: string | null;
  url_pattern: string | null;
  active: boolean;
  last_crawled_at: string | null;
  last_error: string | null;
  articles_ingested_total: number;
}

// ═══════════════════════════════════════════
// Main ingestion handler
// ═══════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse optional params
    let layerFilter: string[] | null = null;
    let scrapeFullText = true;
    let methodFilter: string | null = null;
    let forceAll = false;
    let maxSources = 0; // 0 = no limit
    let sourceNameFilter: string | null = null;
    try {
      const body = await req.json();
      if (body?.layers) layerFilter = body.layers;
      if (body?.scrape_full_text === false) scrapeFullText = false;
      if (body?.method) methodFilter = body.method; // "rss" or "firecrawl"
      if (body?.force_all) forceAll = true; // ignore crawl_frequency
      if (body?.max_sources) maxSources = body.max_sources;
      if (body?.source_name) sourceNameFilter = body.source_name;
    } catch {
      /* no body is fine */
    }

    // ──── Fetch sources from DB ────
    let query = supabase
      .from("sources")
      .select("*")
      .eq("active", true)
      .order("trust_weight", { ascending: false });

    if (sourceNameFilter) {
      query = query.eq("name", sourceNameFilter);
    }
    if (layerFilter) {
      query = query.in("layer", layerFilter);
    }
    if (methodFilter) {
      query = query.eq("ingest_method", methodFilter);
    }

    const { data: dbSources, error: dbError } = await query;
    if (dbError || !dbSources) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `DB error: ${dbError?.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Filter by crawl_frequency (skip sources crawled recently, unless forceAll)
    let sources: DBSource[] = forceAll
      ? dbSources
      : dbSources.filter((s: DBSource) => {
          if (!s.last_crawled_at) return true;
          const lastCrawl = new Date(s.last_crawled_at).getTime();
          const freqMs = s.crawl_frequency_minutes * 60 * 1000;
          return Date.now() - lastCrawl >= freqMs;
        });

    // Apply max_sources cap to prevent compute overload
    if (maxSources > 0 && sources.length > maxSources) {
      console.log(
        `Capping sources from ${sources.length} to ${maxSources}`
      );
      sources = sources.slice(0, maxSources);
    }

    let totalIngested = 0;
    let totalSkipped = 0;
    let totalScraped = 0;
    const errors: string[] = [];
    const sourceStats: Record<string, { ingested: number; scraped: number }> =
      {};

    console.log(
      `Processing ${sources.length} sources (of ${dbSources.length} active, filter: layers=${layerFilter}, method=${methodFilter}, firecrawl=${firecrawlKey ? "yes" : "no"})`
    );

    for (const source of sources) {
      sourceStats[source.name] = { ingested: 0, scraped: 0 };
      let sourceError: string | null = null;

      try {
        if (source.ingest_method === "rss") {
          // ──── RSS INGESTION ────
          for (const url of source.feed_urls) {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 8000);
              const resp = await fetch(url, {
                headers: { "User-Agent": "UPSCPrepBot/2.0" },
                signal: controller.signal,
              });
              clearTimeout(timeout);
              if (!resp.ok) {
                errors.push(`${source.name}: HTTP ${resp.status} for ${url}`);
                sourceError = `HTTP ${resp.status} for ${url}`;
                continue;
              }
              const xml = await resp.text();

              // Validate it's actually RSS/XML
              if (
                !xml.includes("<rss") &&
                !xml.includes("<feed") &&
                !xml.includes("<?xml")
              ) {
                errors.push(`${source.name}: Not valid RSS/XML at ${url}`);
                sourceError = `Not valid RSS/XML at ${url}`;
                continue;
              }

              const items = extractItems(xml);

              for (const item of items.slice(0, 15)) {
                const title = extractTag(item, "title");
                const link = extractTag(item, "link");
                const pubDate = extractTag(item, "pubDate");
                const description = extractTag(item, "description");

                if (!title || !link) continue;
                if (isJunkTitle(title)) {
                  totalSkipped++;
                  continue;
                }

                // Skip old articles (Layer D gets 30-day window, others 48h)
                if (pubDate) {
                  const pubTime = new Date(pubDate).getTime();
                  const maxAgeHours = source.layer === "D" ? 720 : 48;
                  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
                  if (pubTime < cutoff) {
                    totalSkipped++;
                    continue;
                  }
                }

                // Check if already exists
                const { data: existing } = await supabase
                  .from("articles")
                  .select("id, content")
                  .eq("source_url", link)
                  .maybeSingle();

                if (existing) {
                  totalSkipped++;
                  // If exists but no full text and source allows it, scrape it
                  if (
                    scrapeFullText &&
                    source.allow_full_text_storage &&
                    (!existing.content || existing.content.length < 200)
                  ) {
                    const scraped = await scrapeArticleFast(link, firecrawlKey, isJsHeavy(link));
                    if (scraped?.text && scraped.text.length > 100) {
                      await supabase
                        .from("articles")
                        .update({ content: scraped.text, processed: false })
                        .eq("id", existing.id);
                      totalScraped++;
                      sourceStats[source.name].scraped++;
                    }
                  }
                  continue;
                }

                // Insert new article
                let fullContent = description || null;

                // Scrape full text (respect copyright settings)
                const jsHeavy = isJsHeavy(link);
                if (scrapeFullText && source.allow_full_text_storage) {
                  const scraped = await scrapeArticleFast(link, firecrawlKey, jsHeavy);
                  if (scraped?.text && scraped.text.length > 100) {
                    fullContent = scraped.text;
                    totalScraped++;
                    sourceStats[source.name].scraped++;
                  }
                } else if (scrapeFullText && source.allow_excerpt_only) {
                  // For excerpt-only sources, scrape but truncate
                  const scraped = await scrapeArticleFast(link, firecrawlKey, jsHeavy);
                  if (scraped?.text && scraped.text.length > 100) {
                    fullContent =
                      scraped.text.substring(0, 1500) +
                      "\n\n[Content truncated — excerpt only per source policy]";
                    totalScraped++;
                    sourceStats[source.name].scraped++;
                  }
                }

                // Final junk check
                if (isJunkContent(fullContent)) {
                  totalSkipped++;
                  continue;
                }

                const { error } = await supabase.from("articles").insert({
                  source_name: source.name,
                  source_url: link,
                  title,
                  content: fullContent,
                  published_at: pubDate
                    ? new Date(pubDate).toISOString()
                    : null,
                  layer: source.layer,
                  syllabus_tags: source.default_tags || [],
                  processed: false,
                });

                if (error) {
                  totalSkipped++;
                } else {
                  totalIngested++;
                  sourceStats[source.name].ingested++;
                }
              }
            } catch (e) {
              const msg = `${source.name}: ${e instanceof Error ? e.message : "Unknown error"}`;
              errors.push(msg);
              sourceError = msg;
            }
          }
        } else if (source.ingest_method === "firecrawl") {
          // ──── LISTING PAGE SCRAPE INGESTION ────
          // Works with native scrape (free) or Firecrawl (premium)
          for (const listingUrl of source.feed_urls) {
            try {
              // Step 1: Discover article URLs from the listing page
              const articleUrls = await discoverArticleUrls(
                listingUrl,
                source.base_url || listingUrl,
                source.url_pattern,
                firecrawlKey
              );

              if (articleUrls.length === 0) {
                // No links discovered — try scraping the listing page itself as content
                const pageData = await scrapeArticle(listingUrl, firecrawlKey);
                if (
                  pageData?.text &&
                  pageData.text.length > 200 &&
                  !isJunkContent(pageData.text)
                ) {
                  const pageTitle =
                    pageData.title || `${source.label} Update`;
                  if (!isJunkTitle(pageTitle)) {
                    // Check if already exists
                    const { data: existing } = await supabase
                      .from("articles")
                      .select("id")
                      .eq("source_url", listingUrl)
                      .maybeSingle();

                    if (!existing) {
                      let content = pageData.text;
                      if (
                        !source.allow_full_text_storage &&
                        source.allow_excerpt_only
                      ) {
                        content =
                          content.substring(0, 1500) +
                          "\n\n[Content truncated — excerpt only per source policy]";
                      }
                      const { error } = await supabase
                        .from("articles")
                        .insert({
                          source_name: source.name,
                          source_url: listingUrl,
                          title: pageTitle,
                          content,
                          published_at: new Date().toISOString(),
                          layer: source.layer,
                          syllabus_tags: source.default_tags || [],
                          processed: false,
                        });
                      if (!error) {
                        totalIngested++;
                        totalScraped++;
                        sourceStats[source.name].ingested++;
                        sourceStats[source.name].scraped++;
                      }
                    } else {
                      totalSkipped++;
                    }
                  }
                } else {
                  errors.push(
                    `${source.name}: No articles found at ${listingUrl}`
                  );
                  sourceError = `No articles found at ${listingUrl}`;
                }
                continue;
              }

              console.log(
                `${source.name}: Found ${articleUrls.length} article links from ${listingUrl}`
              );

              // Step 2: Scrape individual articles (cap at 10 per source per run)
              let newCount = 0;
              for (const articleUrl of articleUrls) {
                if (newCount >= 10) break;

                // Check if already exists
                const { data: existing } = await supabase
                  .from("articles")
                  .select("id")
                  .eq("source_url", articleUrl)
                  .maybeSingle();

                if (existing) {
                  totalSkipped++;
                  continue;
                }

                // Scrape individual article (enable Jina for JS-heavy sites)
                const articleData = await scrapeArticleFast(
                  articleUrl,
                  firecrawlKey,
                  isJsHeavy(articleUrl)
                );
                if (!articleData?.text || articleData.text.length < 100)
                  continue;

                const articleTitle =
                  articleData.title || `${source.label} Update`;
                if (isJunkTitle(articleTitle)) {
                  totalSkipped++;
                  continue;
                }
                if (isJunkContent(articleData.text)) {
                  totalSkipped++;
                  continue;
                }

                // Respect copyright — truncate for excerpt-only sources
                let content = articleData.text;
                if (
                  !source.allow_full_text_storage &&
                  source.allow_excerpt_only
                ) {
                  content =
                    content.substring(0, 1500) +
                    "\n\n[Content truncated — excerpt only per source policy]";
                }

                const { error } = await supabase.from("articles").insert({
                  source_name: source.name,
                  source_url: articleUrl,
                  title: articleTitle,
                  content,
                  published_at: new Date().toISOString(),
                  layer: source.layer,
                  syllabus_tags: source.default_tags || [],
                  processed: false,
                });

                if (error) {
                  totalSkipped++;
                } else {
                  totalIngested++;
                  totalScraped++;
                  sourceStats[source.name].ingested++;
                  sourceStats[source.name].scraped++;
                  newCount++;
                }
              }
            } catch (e) {
              const msg = `${source.name}: ${e instanceof Error ? e.message : "Unknown error"}`;
              errors.push(msg);
              sourceError = msg;
            }
          }
        }
        // PDF type: future enhancement — skip for now
      } catch (e) {
        const msg = `${source.name}: ${e instanceof Error ? e.message : "Unknown error"}`;
        errors.push(msg);
        sourceError = msg;
      }

      // ──── Update source metadata ────
      const updateData: Record<string, any> = {
        last_crawled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (sourceError) {
        updateData.last_error = sourceError;
      } else {
        updateData.last_error = null;
      }
      if (sourceStats[source.name].ingested > 0) {
        updateData.articles_ingested_total =
          (source.articles_ingested_total || 0) +
          sourceStats[source.name].ingested;
      }

      await supabase
        .from("sources")
        .update(updateData)
        .eq("id", source.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_active_sources: dbSources.length,
        sources_processed: sources.length,
        ingested: totalIngested,
        scraped_full_text: totalScraped,
        skipped_duplicates: totalSkipped,
        errors,
        source_stats: sourceStats,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ingest-rss error:", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
