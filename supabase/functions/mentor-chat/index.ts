import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const userId = claimsData.claims.sub as string;

    const { messages } = await req.json();
    const latestUserMsg =
      [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";

    // 1. Get user's weak topics from quiz history
    const { data: answers } = await supabase
      .from("quiz_answers")
      .select("question_id, is_correct")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    const topicStats: Record<string, { correct: number; total: number }> = {};
    if (answers && answers.length > 0) {
      const qIds = [...new Set(answers.map((a: any) => a.question_id))];
      const { data: mcqs } = await supabase
        .from("mcq_bank")
        .select("id, topic, syllabus_tags")
        .in("id", qIds.slice(0, 100));

      const mcqMap = new Map(
        (mcqs || []).map((m: any) => [m.id, m])
      );

      for (const ans of answers) {
        const mcq = mcqMap.get(ans.question_id);
        if (!mcq) continue;
        const t = mcq.topic;
        if (!topicStats[t]) topicStats[t] = { correct: 0, total: 0 };
        topicStats[t].total++;
        if (ans.is_correct) topicStats[t].correct++;
      }
    }

    const weakTopics = Object.entries(topicStats)
      .map(([topic, s]) => ({ topic, accuracy: s.correct / s.total }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5)
      .map((t) => t.topic);

    // 2. RAG: search facts + articles matching query and weak topics
    const searchTerms = latestUserMsg
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 6);

    let ragContext = "";

    if (searchTerms.length > 0) {
      const pattern = searchTerms.join("|");

      const { data: facts } = await supabase
        .from("facts")
        .select("fact_text, source_url, syllabus_tags")
        .or(
          `fact_text.ilike.%${searchTerms[0]}%,fact_text.ilike.%${searchTerms[1] || searchTerms[0]}%`
        )
        .limit(10);

      const { data: articles } = await supabase
        .from("articles")
        .select("title, source_url, summary, syllabus_tags")
        .or(
          `title.ilike.%${searchTerms[0]}%,summary.ilike.%${searchTerms[1] || searchTerms[0]}%`
        )
        .limit(5);

      if (facts && facts.length > 0) {
        ragContext +=
          "## Relevant Facts from Database:\n" +
          facts
            .map(
              (f: any, i: number) =>
                `${i + 1}. ${f.fact_text} [Source](${f.source_url}) Tags: ${(f.syllabus_tags || []).join(", ")}`
            )
            .join("\n") +
          "\n\n";
      }

      if (articles && articles.length > 0) {
        ragContext +=
          "## Relevant Articles:\n" +
          articles
            .map(
              (a: any, i: number) =>
                `${i + 1}. **${a.title}**: ${a.summary || "No summary"} [Source](${a.source_url}) Tags: ${(a.syllabus_tags || []).join(", ")}`
            )
            .join("\n") +
          "\n\n";
      }
    }

    const weakTopicStr =
      weakTopics.length > 0
        ? `The student is weak in these topics (focus extra here): ${weakTopics.join(", ")}.`
        : "";

    const systemPrompt = `You are an expert UPSC Civil Services mentor. You help aspirants prepare for Prelims (MCQ-based) and Mains (essay/answer-writing).

${weakTopicStr}

INSTRUCTIONS:
- Give accurate, exam-relevant answers with proper analysis
- For Prelims topics, highlight tricky elimination strategies
- For Mains topics, suggest answer structures (intro → body → conclusion)
- Always cite sources when using the provided context using [Source: title](url) format
- If the context below contains relevant facts, USE them and cite them
- Connect topics to the UPSC syllabus (GS Paper I/II/III/IV)
- Be concise but thorough — aspirants value density over fluff
- If you don't know something, say so rather than guessing

${ragContext ? "## CONTEXT FROM DATABASE (use and cite these):\n" + ragContext : "No specific context found for this query — answer from your training knowledge."}`;

    // 3. Call Azure OpenAI
    const endpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    const apiKey = Deno.env.get("AZURE_OPENAI_API_KEY");
    const deployment = Deno.env.get("AZURE_OPENAI_DEPLOYMENT") || "gpt-4.1";
    const apiVersion =
      Deno.env.get("AZURE_OPENAI_API_VERSION") || "2024-12-01-preview";

    if (!endpoint || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Azure OpenAI not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const azureUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(azureUrl, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Azure OpenAI error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("mentor-chat error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
