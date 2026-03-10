import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) {
      throw new Error("SUPABASE_DB_URL not set");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const results: string[] = [];

    const pool = new Pool(dbUrl, 1, true);
    const conn = await pool.connect();

    // Step 1: Cleanup existing pipeline cron jobs
    try {
      await conn.queryArray(
        "SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE 'pipeline_%'"
      );
      results.push("Cleanup: done");
    } catch (e) {
      results.push(`Cleanup: ${e} (may be fine if no jobs)`);
    }

    // Step 2: Create trigger_pipeline function
    await conn.queryArray(`
      CREATE OR REPLACE FUNCTION public.trigger_pipeline(
        p_layer text DEFAULT NULL,
        p_max_sources int DEFAULT 5,
        p_method text DEFAULT NULL
      ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $f$
      DECLARE v_body jsonb;
      BEGIN
        v_body := jsonb_build_object('max_sources', p_max_sources);
        IF p_layer IS NOT NULL THEN
          v_body := v_body || jsonb_build_object('layer', p_layer);
        END IF;
        IF p_method IS NOT NULL THEN
          v_body := v_body || jsonb_build_object('method', p_method);
        END IF;
        PERFORM net.http_post(
          url := '${supabaseUrl}/functions/v1/pipeline-trigger',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ${serviceKey}',
            'Content-Type', 'application/json'
          ),
          body := v_body
        );
      END; $f$
    `);
    results.push("Created: trigger_pipeline()");

    // Step 3: Create trigger_process_content function
    await conn.queryArray(`
      CREATE OR REPLACE FUNCTION public.trigger_process_content()
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $f$
      BEGIN
        PERFORM net.http_post(
          url := '${supabaseUrl}/functions/v1/process-content',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ${serviceKey}',
            'Content-Type', 'application/json'
          ),
          body := '{"batch_size":5}'::jsonb
        );
      END; $f$
    `);
    results.push("Created: trigger_process_content()");

    // Step 4: Schedule all cron jobs
    const cronJobs = [
      {
        name: "pipeline_layer_ab_rss",
        schedule: "30 0,4,8,12,16,20 * * *",
        command:
          "SELECT public.trigger_pipeline('A', 5, 'rss'); SELECT public.trigger_pipeline('B', 5, 'rss');",
        desc: "Layer A+B RSS every 4h",
      },
      {
        name: "pipeline_layer_ab_scrape",
        schedule: "0 1,7,13,19 * * *",
        command:
          "SELECT public.trigger_pipeline('A', 3, 'firecrawl'); SELECT public.trigger_pipeline('B', 3, 'firecrawl');",
        desc: "Layer A+B scrape every 6h",
      },
      {
        name: "pipeline_layer_c",
        schedule: "0 2,8,14,20 * * *",
        command: "SELECT public.trigger_pipeline('C', 5);",
        desc: "Layer C every 6h",
      },
      {
        name: "pipeline_layer_d",
        schedule: "30 1 * * 1",
        command: "SELECT public.trigger_pipeline('D', 5);",
        desc: "Layer D weekly Monday",
      },
      {
        name: "pipeline_process",
        schedule: "15 */2 * * *",
        command: "SELECT public.trigger_process_content();",
        desc: "AI processing every 2h",
      },
      {
        name: "pipeline_process_morning",
        schedule: "45 1,2,3 * * *",
        command: "SELECT public.trigger_process_content();",
        desc: "Morning burst 7-9 AM IST",
      },
    ];

    for (const job of cronJobs) {
      try {
        await conn.queryArray(
          `SELECT cron.schedule('${job.name}', '${job.schedule}', $cmd$${job.command}$cmd$)`
        );
        results.push(`Scheduled: ${job.name} (${job.schedule}) — ${job.desc}`);
      } catch (e) {
        results.push(`FAILED: ${job.name} — ${e}`);
      }
    }

    // Step 5: Verify
    const verify = await conn.queryArray(
      "SELECT jobname, schedule FROM cron.job WHERE jobname LIKE 'pipeline_%' ORDER BY jobname"
    );
    results.push(`\nVerified ${verify.rows.length} active cron jobs:`);
    for (const row of verify.rows) {
      results.push(`  ${row[0]}: ${row[1]}`);
    }

    conn.release();
    await pool.end();

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : String(e),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
