import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// RSS feed sources — Layer B (Media)
const RSS_FEEDS = [
  {
    name: "the_hindu",
    label: "The Hindu",
    urls: [
      "https://www.thehindu.com/news/national/feeder/default.rss",
      "https://www.thehindu.com/business/Economy/feeder/default.rss",
      "https://www.thehindu.com/sci-tech/science/feeder/default.rss",
    ],
    layer: "B",
  },
  {
    name: "pib",
    label: "PIB",
    urls: ["https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3"],
    layer: "A", // Canonical government source
  },
  {
    name: "livemint",
    label: "LiveMint",
    urls: [
      "https://www.livemint.com/rss/economy",
      "https://www.livemint.com/rss/politics",
    ],
    layer: "B",
  },
];

// Simple XML tag extractor (no deps needed)
function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let totalIngested = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const feed of RSS_FEEDS) {
      for (const url of feed.urls) {
        try {
          const resp = await fetch(url, {
            headers: { "User-Agent": "UPSCPrepBot/1.0" },
          });
          if (!resp.ok) {
            errors.push(`${feed.name}: HTTP ${resp.status} for ${url}`);
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

            const { error } = await supabase.from("articles").upsert(
              {
                source_name: feed.name,
                source_url: link,
                title,
                content: description || null,
                published_at: pubDate ? new Date(pubDate).toISOString() : null,
                layer: feed.layer,
                processed: false,
              },
              { onConflict: "source_url", ignoreDuplicates: true }
            );

            if (error) {
              totalSkipped++;
            } else {
              totalIngested++;
            }
          }
        } catch (e) {
          errors.push(`${feed.name}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ingested: totalIngested,
        skipped: totalSkipped,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ingest-rss error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
