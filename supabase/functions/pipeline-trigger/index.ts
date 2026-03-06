import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Step 1: Ingest RSS
    console.log("Pipeline: Starting RSS ingestion...");
    const ingestResp = await fetch(`${supabaseUrl}/functions/v1/ingest-rss`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scrape_full_text: true }),
    });
    const ingestResult = await ingestResp.json();
    console.log("Pipeline: Ingestion complete", JSON.stringify(ingestResult));

    // Step 2: Process content with AI
    console.log("Pipeline: Starting AI processing...");
    const processResp = await fetch(`${supabaseUrl}/functions/v1/process-content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batch_size: 5 }),
    });
    const processResult = await processResp.json();
    console.log("Pipeline: Processing complete", JSON.stringify(processResult));

    return new Response(
      JSON.stringify({
        success: true,
        ingest: ingestResult,
        process: processResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("pipeline-trigger error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
