import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// CONTENT PIPELINE — FULL SOURCE REGISTRY (47 Sources, 4 Layers)
// ═══════════════════════════════════════════════════════════════
//
// Layer A — Canonical Government Sources (highest trust)
// Layer B — Quality Media Sources
// Layer C — Coaching Benchmark Sources
// Layer D — Global Reports & Indices
// ═══════════════════════════════════════════════════════════════

interface SourceEntry {
  name: string;
  label: string;
  layer: "A" | "B" | "C" | "D";
  type: "rss" | "scrape" | "pdf";
  urls: string[];
  tags?: string[]; // default syllabus tags
  scrapeSelector?: string; // hint for main content
}

const SOURCE_REGISTRY: SourceEntry[] = [
  // ──────────── LAYER A: CANONICAL GOVERNMENT ────────────
  {
    name: "pib",
    label: "Press Information Bureau",
    layer: "A",
    type: "rss",
    urls: [
      "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
    ],
    tags: ["Polity", "Economy"],
  },
  {
    name: "prs_legislative",
    label: "PRS Legislative Research",
    layer: "A",
    type: "scrape",
    urls: [
      "https://prsindia.org/billtrack",
      "https://prsindia.org/policy/vital-stats",
    ],
    tags: ["Polity"],
  },
  {
    name: "niti_aayog",
    label: "NITI Aayog",
    layer: "A",
    type: "scrape",
    urls: ["https://www.niti.gov.in/reports-and-publications"],
    tags: ["Economy", "Polity"],
  },
  {
    name: "rbi_bulletin",
    label: "RBI Bulletin & Reports",
    layer: "A",
    type: "scrape",
    urls: ["https://www.rbi.org.in/Scripts/BS_ViewBulletin.aspx"],
    tags: ["Economy"],
  },
  {
    name: "moef",
    label: "Ministry of Environment",
    layer: "A",
    type: "scrape",
    urls: ["https://moef.gov.in/en/recent-initiatives/"],
    tags: ["Environment"],
  },
  {
    name: "mea",
    label: "Ministry of External Affairs",
    layer: "A",
    type: "scrape",
    urls: ["https://www.mea.gov.in/press-releases.htm"],
    tags: ["IR"],
  },
  {
    name: "rajya_sabha",
    label: "Rajya Sabha Q&A Summaries",
    layer: "A",
    type: "scrape",
    urls: ["https://rajyasabha.nic.in/"],
    tags: ["Polity"],
  },
  {
    name: "india_budget",
    label: "Union Budget Documents",
    layer: "A",
    type: "scrape",
    urls: ["https://www.indiabudget.gov.in/"],
    tags: ["Economy"],
  },
  {
    name: "survey_of_india",
    label: "Economic Survey",
    layer: "A",
    type: "scrape",
    urls: ["https://www.indiabudget.gov.in/economicsurvey/"],
    tags: ["Economy"],
  },
  {
    name: "isro",
    label: "ISRO Updates",
    layer: "A",
    type: "scrape",
    urls: ["https://www.isro.gov.in/UpdatesFromISRO.html"],
    tags: ["Science"],
  },

  // ──────────── LAYER B: QUALITY MEDIA ────────────
  {
    name: "the_hindu",
    label: "The Hindu",
    layer: "B",
    type: "rss",
    urls: [
      "https://www.thehindu.com/news/national/feeder/default.rss",
      "https://www.thehindu.com/business/Economy/feeder/default.rss",
      "https://www.thehindu.com/sci-tech/science/feeder/default.rss",
      "https://www.thehindu.com/news/international/feeder/default.rss",
    ],
  },
  {
    name: "indian_express",
    label: "Indian Express",
    layer: "B",
    type: "rss",
    urls: [
      "https://indianexpress.com/section/india/feed/",
      "https://indianexpress.com/section/explained/feed/",
      "https://indianexpress.com/section/opinion/feed/",
    ],
  },
  {
    name: "livemint",
    label: "LiveMint",
    layer: "B",
    type: "rss",
    urls: [
      "https://www.livemint.com/rss/economy",
      "https://www.livemint.com/rss/politics",
      "https://www.livemint.com/rss/science",
    ],
  },
  {
    name: "down_to_earth",
    label: "Down To Earth",
    layer: "B",
    type: "rss",
    urls: ["https://www.downtoearth.org.in/rss/0"],
    tags: ["Environment"],
  },
  {
    name: "the_wire",
    label: "The Wire",
    layer: "B",
    type: "rss",
    urls: [
      "https://thewire.in/feed",
    ],
  },
  {
    name: "scroll",
    label: "Scroll.in",
    layer: "B",
    type: "rss",
    urls: ["https://scroll.in/rss/feed"],
  },
  {
    name: "bbc_india",
    label: "BBC India",
    layer: "B",
    type: "rss",
    urls: ["https://feeds.bbci.co.uk/news/world/asia/india/rss.xml"],
    tags: ["IR"],
  },
  {
    name: "reuters_india",
    label: "Reuters India",
    layer: "B",
    type: "rss",
    urls: ["https://www.reuters.com/news/archive/india-news?view=page&page=1&pageSize=10"],
  },
  {
    name: "business_standard",
    label: "Business Standard",
    layer: "B",
    type: "rss",
    urls: [
      "https://www.business-standard.com/rss/economy-policy-10200.rss",
    ],
    tags: ["Economy"],
  },
  {
    name: "epw",
    label: "Economic & Political Weekly",
    layer: "B",
    type: "scrape",
    urls: ["https://www.epw.in/"],
    tags: ["Economy", "Society"],
  },
  {
    name: "frontline",
    label: "Frontline",
    layer: "B",
    type: "scrape",
    urls: ["https://frontline.thehindu.com/"],
  },
  {
    name: "science_reporter",
    label: "Science Reporter (CSIR)",
    layer: "B",
    type: "scrape",
    urls: ["https://www.niscpr.res.in/periodicals/science-reporter"],
    tags: ["Science"],
  },
  {
    name: "yojana",
    label: "Yojana Magazine",
    layer: "B",
    type: "scrape",
    urls: ["https://www.publicationsdivision.nic.in/"],
    tags: ["Economy", "Society"],
  },
  {
    name: "kurukshetra",
    label: "Kurukshetra Magazine",
    layer: "B",
    type: "scrape",
    urls: ["https://www.publicationsdivision.nic.in/"],
    tags: ["Society"],
  },

  // ──────────── LAYER C: COACHING BENCHMARK ────────────
  {
    name: "insights_ias",
    label: "InsightsIAS Current Affairs",
    layer: "C",
    type: "scrape",
    urls: ["https://www.insightsonindia.com/category/current-affairs/"],
  },
  {
    name: "iasbaba",
    label: "IAS Baba Daily Current Affairs",
    layer: "C",
    type: "scrape",
    urls: ["https://iasbaba.com/current-affairs-for-ias-upsc-exams/"],
  },
  {
    name: "vision_ias",
    label: "Vision IAS Monthly Magazine",
    layer: "C",
    type: "scrape",
    urls: ["https://visionias.in/resources/current-affairs"],
  },
  {
    name: "drishti_ias",
    label: "Drishti IAS Daily News",
    layer: "C",
    type: "rss",
    urls: ["https://www.drishtiias.com/current-affairs-news-analysis-editorials"],
  },
  {
    name: "civilsdaily",
    label: "CivilsDaily",
    layer: "C",
    type: "scrape",
    urls: ["https://www.civilsdaily.com/"],
  },
  {
    name: "forumias",
    label: "ForumIAS",
    layer: "C",
    type: "scrape",
    urls: ["https://forumias.com/blog/"],
  },
  {
    name: "unacademy_upsc",
    label: "Unacademy UPSC Blog",
    layer: "C",
    type: "scrape",
    urls: ["https://unacademy.com/content/upsc/"],
  },

  // ──────────── LAYER D: GLOBAL REPORTS & INDICES ────────────
  {
    name: "undp_hdr",
    label: "UNDP Human Development Report",
    layer: "D",
    type: "scrape",
    urls: ["https://hdr.undp.org/"],
    tags: ["Society", "Economy"],
  },
  {
    name: "world_bank",
    label: "World Bank India",
    layer: "D",
    type: "scrape",
    urls: ["https://www.worldbank.org/en/country/india"],
    tags: ["Economy"],
  },
  {
    name: "imf_india",
    label: "IMF India Reports",
    layer: "D",
    type: "scrape",
    urls: ["https://www.imf.org/en/Countries/IND"],
    tags: ["Economy"],
  },
  {
    name: "wef_reports",
    label: "World Economic Forum",
    layer: "D",
    type: "scrape",
    urls: ["https://www.weforum.org/"],
    tags: ["Economy", "IR"],
  },
  {
    name: "ipcc",
    label: "IPCC Reports",
    layer: "D",
    type: "scrape",
    urls: ["https://www.ipcc.ch/reports/"],
    tags: ["Environment"],
  },
  {
    name: "who_india",
    label: "WHO India",
    layer: "D",
    type: "scrape",
    urls: ["https://www.who.int/india"],
    tags: ["Science", "Society"],
  },
  {
    name: "transparency_intl",
    label: "Transparency International CPI",
    layer: "D",
    type: "scrape",
    urls: ["https://www.transparency.org/en/cpi"],
    tags: ["Polity", "Ethics"],
  },
  {
    name: "fao",
    label: "FAO Reports",
    layer: "D",
    type: "scrape",
    urls: ["https://www.fao.org/india/en/"],
    tags: ["Economy", "Environment"],
  },
  {
    name: "iea",
    label: "IEA Energy Reports",
    layer: "D",
    type: "scrape",
    urls: ["https://www.iea.org/countries/india"],
    tags: ["Economy", "Environment"],
  },
  {
    name: "unep",
    label: "UNEP Reports",
    layer: "D",
    type: "scrape",
    urls: ["https://www.unep.org/"],
    tags: ["Environment"],
  },
  {
    name: "wto",
    label: "WTO Trade Reports",
    layer: "D",
    type: "scrape",
    urls: ["https://www.wto.org/english/res_e/publications_e/publications_e.htm"],
    tags: ["Economy", "IR"],
  },
  {
    name: "un_sdg",
    label: "UN SDG Progress",
    layer: "D",
    type: "scrape",
    urls: ["https://sdgs.un.org/goals"],
    tags: ["Society", "Environment"],
  },
  {
    name: "global_hunger_index",
    label: "Global Hunger Index",
    layer: "D",
    type: "scrape",
    urls: ["https://www.globalhungerindex.org/"],
    tags: ["Society"],
  },
  {
    name: "rsf_press_freedom",
    label: "RSF Press Freedom Index",
    layer: "D",
    type: "scrape",
    urls: ["https://rsf.org/en/index"],
    tags: ["Polity", "Society"],
  },
  {
    name: "heritage_economic_freedom",
    label: "Heritage Economic Freedom Index",
    layer: "D",
    type: "scrape",
    urls: ["https://www.heritage.org/index/"],
    tags: ["Economy"],
  },
];

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
  return items;
}

// ═══════════════════════════════════════════
// Firecrawl scraper for full article text
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
      const t = await response.text();
      console.error(t);
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
// Firecrawl search for Layer D report sources
// ═══════════════════════════════════════════
async function searchWithFirecrawl(
  query: string,
  firecrawlKey: string,
  limit = 5
): Promise<Array<{ url: string; title: string; markdown?: string }>> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data?.data || []).map((r: any) => ({
      url: r.url,
      title: r.title || "",
      markdown: r.markdown || "",
    }));
  } catch {
    return [];
  }
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
    let typeFilter: string | null = null;
    try {
      const body = await req.json();
      if (body?.layers) layerFilter = body.layers;
      if (body?.scrape_full_text === false) scrapeFullText = false;
      if (body?.type) typeFilter = body.type; // "rss" or "scrape"
    } catch { /* no body is fine */ }

    let totalIngested = 0;
    let totalSkipped = 0;
    let totalScraped = 0;
    const errors: string[] = [];
    const sourceStats: Record<string, { ingested: number; scraped: number }> = {};

    // Filter sources
    let sources = SOURCE_REGISTRY;
    if (layerFilter) sources = sources.filter((s) => layerFilter!.includes(s.layer));
    if (typeFilter) sources = sources.filter((s) => s.type === typeFilter);

    console.log(`Processing ${sources.length} sources (filter: layers=${layerFilter}, type=${typeFilter})`);

    for (const source of sources) {
      sourceStats[source.name] = { ingested: 0, scraped: 0 };

      if (source.type === "rss") {
        // ──── RSS INGESTION ────
        for (const url of source.urls) {
          try {
            const resp = await fetch(url, {
              headers: { "User-Agent": "UPSCPrepBot/2.0" },
            });
            if (!resp.ok) {
              errors.push(`${source.name}: HTTP ${resp.status} for ${url}`);
              continue;
            }
            const xml = await resp.text();
            const items = extractItems(xml);

            for (const item of items.slice(0, 15)) {
              const title = extractTag(item, "title");
              const link = extractTag(item, "link");
              const pubDate = extractTag(item, "pubDate");
              const description = extractTag(item, "description");

              if (!title || !link) continue;

              // Check if already exists
              const { data: existing } = await supabase
                .from("articles")
                .select("id, content")
                .eq("source_url", link)
                .maybeSingle();

              if (existing) {
                totalSkipped++;
                // If exists but no full text, scrape it
                if (scrapeFullText && firecrawlKey && (!existing.content || existing.content.length < 200)) {
                  const scraped = await scrapeWithFirecrawl(link, firecrawlKey);
                  if (scraped?.markdown && scraped.markdown.length > 100) {
                    await supabase
                      .from("articles")
                      .update({ content: scraped.markdown, processed: false })
                      .eq("id", existing.id);
                    totalScraped++;
                    sourceStats[source.name].scraped++;
                  }
                }
                continue;
              }

              // Insert new article
              let fullContent = description || null;

              // Scrape full text with Firecrawl
              if (scrapeFullText && firecrawlKey) {
                const scraped = await scrapeWithFirecrawl(link, firecrawlKey);
                if (scraped?.markdown && scraped.markdown.length > 100) {
                  fullContent = scraped.markdown;
                  totalScraped++;
                  sourceStats[source.name].scraped++;
                }
              }

              const { error } = await supabase.from("articles").insert({
                source_name: source.name,
                source_url: link,
                title,
                content: fullContent,
                published_at: pubDate ? new Date(pubDate).toISOString() : null,
                layer: source.layer,
                syllabus_tags: source.tags || [],
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
            errors.push(`${source.name}: ${e instanceof Error ? e.message : "Unknown error"}`);
          }
        }
      } else if (source.type === "scrape" && firecrawlKey) {
        // ──── FIRECRAWL SCRAPE INGESTION ────
        for (const url of source.urls) {
          try {
            const scraped = await scrapeWithFirecrawl(url, firecrawlKey);
            if (!scraped?.markdown || scraped.markdown.length < 50) {
              errors.push(`${source.name}: Empty scrape for ${url}`);
              continue;
            }

            // Check if already exists
            const { data: existing } = await supabase
              .from("articles")
              .select("id")
              .eq("source_url", url)
              .maybeSingle();

            if (existing) {
              // Update content if it changed substantially
              await supabase
                .from("articles")
                .update({ content: scraped.markdown, processed: false })
                .eq("id", existing.id);
              totalSkipped++;
              continue;
            }

            const { error } = await supabase.from("articles").insert({
              source_name: source.name,
              source_url: url,
              title: scraped.title || `${source.label} Update`,
              content: scraped.markdown,
              published_at: new Date().toISOString(),
              layer: source.layer,
              syllabus_tags: source.tags || [],
              processed: false,
            });

            if (error) {
              totalSkipped++;
            } else {
              totalIngested++;
              sourceStats[source.name].ingested++;
              totalScraped++;
              sourceStats[source.name].scraped++;
            }
          } catch (e) {
            errors.push(`${source.name}: ${e instanceof Error ? e.message : "Unknown error"}`);
          }
        }
      }
      // PDF type: future enhancement — skip for now
    }

    return new Response(
      JSON.stringify({
        success: true,
        registry_size: SOURCE_REGISTRY.length,
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
