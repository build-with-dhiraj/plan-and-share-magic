import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Strip problematic Unicode characters that break PostgreSQL JSONB
function sanitizeForDb(text: string): string {
  return text
    .replace(/\u0000/g, "") // null bytes
    .replace(/[\uD800-\uDFFF]/g, "") // orphan surrogates
    .replace(/\\u0000/g, "") // escaped null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""); // control chars (keep \t \n \r)
}

// ═══════════════════════════════════════════
// Archive URL generators for each source
// ═══════════════════════════════════════════
function formatDate(d: Date, fmt: string): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const mon = monthNames[d.getMonth()];
  return fmt
    .replace("DD", dd).replace("MM", mm).replace("YYYY", String(yyyy))
    .replace("D", String(d.getDate())).replace("MONTH", mon);
}

function generateDrishtiUrls(from: Date, to: Date): { url: string; date: string; source: string }[] {
  const urls: { url: string; date: string; source: string }[] = [];
  const d = new Date(from);
  while (d <= to) {
    const dateStr = formatDate(d, "DD-MM-YYYY");
    urls.push({
      url: `https://www.drishtiias.com/current-affairs-news-analysis-editorials/news-analysis/${dateStr}`,
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,
      source: "drishti_ias_v2",
    });
    // Also editorial
    urls.push({
      url: `https://www.drishtiias.com/current-affairs-news-analysis-editorials/news-editorials/${dateStr}`,
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,
      source: "drishti_ias_v2",
    });
    d.setDate(d.getDate() + 1);
  }
  return urls;
}

function generateSuperkalamUrls(from: Date, to: Date): { url: string; date: string; source: string }[] {
  const urls: { url: string; date: string; source: string }[] = [];
  const d = new Date(from);
  while (d <= to) {
    const day = d.getDate();
    const mon = ["january","february","march","april","may","june","july","august","september","october","november","december"][d.getMonth()];
    const yyyy = d.getFullYear();
    // SuperKalam pattern: /daily-current-affairs-16-march-2026-key-upsc-news-and-updates/
    urls.push({
      url: `https://superkalam.com/daily-current-affairs-${day}-${mon}-${yyyy}-key-upsc-news-and-updates/`,
      date: `${yyyy}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,
      source: "superkalam_v2",
    });
    d.setDate(d.getDate() + 1);
  }
  return urls;
}

function generateTheHinduUrls(from: Date, to: Date): { url: string; date: string; source: string }[] {
  const urls: { url: string; date: string; source: string }[] = [];
  const d = new Date(from);
  while (d <= to) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    // The Hindu editorials by date: /opinion/editorial/YYYY-MM-DD/
    urls.push({
      url: `https://www.thehindu.com/news/national/`,
      date: `${yyyy}-${mm}-${dd}`,
      source: "the_hindu",
    });
    d.setDate(d.getDate() + 7); // weekly only for The Hindu (RSS handles daily)
  }
  return urls;
}

// ═══════════════════════════════════════════
// Native HTML scraper
// ═══════════════════════════════════════════
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n)));
}

async function nativeScrape(url: string): Promise<{ text: string; title: string; links: string[] } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const html = await resp.text();
    if (html.length < 200) return null;

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = decodeEntities(titleMatch?.[1] ?? "").trim();

    // Extract links
    const links: string[] = [];
    const linkRegex = /<a[^>]+href=["']([^"'#]+)["']/gi;
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      let href = m[1].trim();
      if (href.startsWith("/")) {
        try { const base = new URL(url); href = `${base.protocol}//${base.host}${href}`; } catch { continue; }
      }
      if (href.startsWith("http")) links.push(href);
    }

    // Extract text content
    let content = html;
    content = content.replace(/<script[\s\S]*?<\/script>/gi, "");
    content = content.replace(/<style[\s\S]*?<\/style>/gi, "");
    content = content.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    content = content.replace(/<header[\s\S]*?<\/header>/gi, "");
    content = content.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    content = content.replace(/<aside[\s\S]*?<\/aside>/gi, "");

    const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (articleMatch) content = articleMatch[1] || articleMatch[0];

    let text = content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    text = decodeEntities(text);
    if (text.length < 100) return null;
    return { text, title, links: [...new Set(links)] };
  } catch { return null; }
}

// ═══════════════════════════════════════════
// Jina AI Reader (handles JS-rendered sites)
// ═══════════════════════════════════════════
async function scrapeWithJina(url: string): Promise<{ text: string; title?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const resp = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "application/json", "X-No-Cache": "true", "X-Return-Format": "markdown" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const raw = await resp.text();
    try {
      const json = JSON.parse(raw);
      const data = json.data || json;
      const markdown = data.content || data.markdown || data.text || "";
      if (markdown.length < 100) return null;
      return { text: markdown, title: data.title };
    } catch {
      if (raw.length < 100) return null;
      return { text: raw };
    }
  } catch { return null; }
}

// URL patterns to filter valid article links
const ARTICLE_URL_PATTERNS: Record<string, RegExp> = {
  drishti_ias_v2: /drishtiias\.com\/.+\/.+/,
  superkalam_v2: /superkalam\.com\/.+-upsc/i,
  the_hindu: /thehindu\.com\/.*article\d+/,
};

const SKIP_URL_PATTERNS = [
  /\/login/i, /\/register/i, /\/about/i, /\/contact/i,
  /\/cart/i, /\/pricing/i, /\/test-series/i, /\/mock-test/i,
  /\/course/i, /\/batch/i, /\/enrol/i, /\/scholarship/i,
  /\/download/i, /\/app/i, /\.pdf$/i, /\.jpg$/i, /\.png$/i,
  /\/tag\//i, /\/category\//i, /\/author\//i, /\/page\/\d/i,
  /\/hi\//i, // Hindi version
  /\/search/i,
];

function isValidArticleUrl(url: string, source: string): boolean {
  if (SKIP_URL_PATTERNS.some(p => p.test(url))) return false;
  const pattern = ARTICLE_URL_PATTERNS[source];
  if (pattern) return pattern.test(url);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse date range from body
    let fromDate = "2026-02-01";
    let toDate = "2026-03-17";
    let maxPages = 10; // max archive pages to process per invocation
    try {
      const body = await req.json();
      if (body?.from) fromDate = body.from;
      if (body?.to) toDate = body.to;
      if (body?.max_pages) maxPages = Math.min(body.max_pages, 20);
    } catch { /* no body is fine */ }

    const from = new Date(fromDate + "T00:00:00Z");
    const to = new Date(toDate + "T00:00:00Z");

    console.log(`Backfill: ${fromDate} → ${toDate}, max ${maxPages} pages`);

    // Generate all archive URLs
    const allUrls = [
      ...generateDrishtiUrls(from, to),
      ...generateSuperkalamUrls(from, to),
    ];

    // Shuffle to spread sources and dates
    for (let i = allUrls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allUrls[i], allUrls[j]] = [allUrls[j], allUrls[i]];
    }

    // Take only maxPages
    const toProcess = allUrls.slice(0, maxPages);
    let totalIngested = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const item of toProcess) {
      try {
        console.log(`Scraping: ${item.url}`);

        // 1. Try native scrape first, then Jina
        let scraped = await nativeScrape(item.url);
        if (!scraped || scraped.text.length < 200) {
          const jina = await scrapeWithJina(item.url);
          if (jina) scraped = { text: jina.text, title: jina.title || "", links: [] };
        }

        if (!scraped || scraped.text.length < 200) {
          errors.push(`Empty scrape: ${item.url}`);
          continue;
        }

        // 2. For listing pages — check if this is a listing page with links to articles
        const isListing = scraped.links && scraped.links.length > 5;

        if (isListing) {
          // Discover and scrape child article links
          const articleLinks = scraped.links
            .filter(l => isValidArticleUrl(l, item.source))
            .slice(0, 10); // max 10 articles per listing page

          for (const articleUrl of articleLinks) {
            // Check if already exists
            const { data: existing } = await supabase
              .from("articles")
              .select("id")
              .eq("source_url", articleUrl)
              .limit(1);

            if (existing && existing.length > 0) {
              totalSkipped++;
              continue;
            }

            // Scrape the article
            const articleScraped = await nativeScrape(articleUrl);
            if (!articleScraped || articleScraped.text.length < 200) continue;

            const title = articleScraped.title || articleUrl.split("/").pop()?.replace(/-/g, " ") || "Untitled";
            if (title.length < 5 || /404|not found|error/i.test(title)) continue;

            const { error: insertErr } = await supabase.from("articles").insert({
              title: sanitizeForDb(title).slice(0, 500),
              content: sanitizeForDb(articleScraped.text).slice(0, 15000),
              source_name: item.source,
              source_url: articleUrl,
              layer: item.source === "the_hindu" ? "B" : item.source.includes("drishti") || item.source.includes("superkalam") ? "C" : "A",
              published_at: `${item.date}T06:00:00+05:30`,
              processed: false,
            });

            if (insertErr) {
              if (insertErr.message.includes("duplicate")) { totalSkipped++; }
              else { errors.push(`Insert error: ${insertErr.message}`); }
            } else {
              totalIngested++;
            }
          }
        } else {
          // Direct article page — ingest directly
          const { data: existing } = await supabase
            .from("articles")
            .select("id")
            .eq("source_url", item.url)
            .limit(1);

          if (existing && existing.length > 0) {
            totalSkipped++;
            continue;
          }

          const title = scraped.title || item.url.split("/").pop()?.replace(/-/g, " ") || "Untitled";
          if (title.length < 5 || /404|not found|error/i.test(title)) continue;

          const { error: insertErr } = await supabase.from("articles").insert({
            title: sanitizeForDb(title).slice(0, 500),
            content: sanitizeForDb(scraped.text).slice(0, 15000),
            source_name: item.source,
            source_url: item.url,
            layer: item.source.includes("drishti") || item.source.includes("superkalam") ? "C" : "A",
            published_at: `${item.date}T06:00:00+05:30`,
            processed: false,
          });

          if (insertErr) {
            if (insertErr.message.includes("duplicate")) { totalSkipped++; }
            else { errors.push(`Insert error: ${insertErr.message}`); }
          } else {
            totalIngested++;
          }
        }
      } catch (e) {
        errors.push(`${item.url}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date_range: `${fromDate} → ${toDate}`,
        pages_scraped: toProcess.length,
        articles_ingested: totalIngested,
        skipped_duplicates: totalSkipped,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("backfill error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
