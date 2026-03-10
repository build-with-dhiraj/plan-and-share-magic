import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// Pipeline Trigger — Compute-Safe Orchestrator
//
// Instead of one giant call, this processes ONE layer at a time
// with a max_sources cap. Call it multiple times for full coverage.
//
// Usage:
//   POST { }                          → auto-select next layer (round-robin A→B→C)
//   POST { "layer": "D" }             → process only Layer D
//   POST { "layer": "B", "method": "rss" }  → Layer B RSS only
//   POST { "layer": "all" }           → all layers (risky for compute)
//   POST { "max_sources": 3 }         → cap at 3 sources per call
//   POST { "process": false }         → skip AI processing step
//   POST { "source_name": "hindu" }   → process a single source
// ═══════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse params
    let layer: string | null = null;
    let method: string | null = null;
    let maxSources = 5;
    let runProcess = true;
    let sourceName: string | null = null;
    let forceAll = false;

    try {
      const body = await req.json();
      layer = body?.layer || null;
      method = body?.method || null;
      maxSources = body?.max_sources ?? 5;
      runProcess = body?.process !== false;
      sourceName = body?.source_name || null;
      forceAll = body?.force_all || false;
    } catch {
      /* no body = auto-mode */
    }

    // ──── Auto-select layer if none specified ────
    // Round-robin: pick the layer that was crawled least recently
    if (!layer && !sourceName) {
      const { data: layerStats } = await supabase
        .from("sources")
        .select("layer, last_crawled_at")
        .eq("active", true)
        .not("layer", "eq", "D") // skip Layer D from auto-rotation (weekly)
        .order("last_crawled_at", { ascending: true, nullsFirst: true })
        .limit(1);

      layer = layerStats?.[0]?.layer || "B";
      console.log(`Pipeline: Auto-selected layer ${layer} (least recently crawled)`);
    }

    const results: Record<string, any> = {};

    // ──── Step 1: Ingest ────
    console.log(
      `Pipeline: Ingesting layer=${layer || "auto"}, method=${method || "all"}, ` +
      `max_sources=${maxSources}, source=${sourceName || "all"}`
    );

    const ingestPayload: Record<string, any> = {
      scrape_full_text: true,
      max_sources: maxSources,
    };

    if (layer && layer !== "all") {
      ingestPayload.layers = [layer];
    }
    if (method) {
      ingestPayload.method = method;
    }
    if (sourceName) {
      ingestPayload.source_name = sourceName;
    }
    if (forceAll) {
      ingestPayload.force_all = true;
    }

    const ingestResp = await fetch(`${supabaseUrl}/functions/v1/ingest-rss`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ingestPayload),
    });

    const ingestResult = await ingestResp.json();
    results.ingest = ingestResult;
    console.log(
      `Pipeline: Ingested ${ingestResult?.ingested || 0} articles ` +
      `(${ingestResult?.sources_processed || 0} sources)`
    );

    // ──── Step 2: Process with AI (if enabled and articles were ingested) ────
    if (runProcess) {
      console.log("Pipeline: Starting AI processing (batch_size=5)...");
      const processResp = await fetch(
        `${supabaseUrl}/functions/v1/process-content`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ batch_size: 5 }),
        }
      );
      const processResult = await processResp.json();
      results.process = processResult;
      console.log(
        `Pipeline: Processed ${processResult?.processed || 0} articles`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        layer: layer || "auto",
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("pipeline-trigger error:", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : "Unknown",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
