import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYLLABUS_TOPICS = [
  "Polity", "Economy", "Geography", "Environment", "History",
  "Science", "IR", "Society", "Ethics", "Art & Culture",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse optional batch_size from body
    let batchSize = 5;
    try {
      const body = await req.json();
      if (body?.batch_size) batchSize = Math.min(body.batch_size, 20);
    } catch { /* no body is fine */ }

    // Fetch unprocessed articles
    const { data: articles, error: fetchErr } = await supabase
      .from("articles")
      .select("*")
      .eq("processed", false)
      .order("ingested_at", { ascending: true })
      .limit(batchSize);

    if (fetchErr) throw fetchErr;
    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No unprocessed articles" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalFacts = 0;
    let totalMCQs = 0;
    const errors: string[] = [];

    for (const article of articles) {
      try {
        // ──── STEP 1: Extract facts + tag syllabus ────
        const extractPrompt = `You are a UPSC Civil Services Prelims fact-extraction engine.

ARTICLE TITLE: ${article.title}
SOURCE: ${article.source_name} (${article.source_url})
CONTENT: ${article.content || article.title}

INSTRUCTIONS:
1. Extract 2-5 UPSC-relevant factual statements from this article.
2. Each fact MUST be directly stated or clearly derivable from the article text — NO inference, NO hallucination.
3. Tag each fact with 1-3 UPSC syllabus topics from: ${SYLLABUS_TOPICS.join(", ")}
4. Rate confidence (0.5-1.0) based on how explicitly the fact is stated.

FACT SAFETY: If the article doesn't contain UPSC-relevant facts, return an empty array.`;

        const factResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You extract UPSC-relevant facts from news articles. Return structured data via tool calls." },
              { role: "user", content: extractPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "submit_facts",
                  description: "Submit extracted facts from the article",
                  parameters: {
                    type: "object",
                    properties: {
                      facts: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            fact_text: { type: "string", description: "The factual statement" },
                            syllabus_tags: { type: "array", items: { type: "string" }, description: "UPSC syllabus topics" },
                            confidence: { type: "number", description: "0.5-1.0 confidence score" },
                          },
                          required: ["fact_text", "syllabus_tags", "confidence"],
                          additionalProperties: false,
                        },
                      },
                      summary: { type: "string", description: "One-line UPSC-relevant summary of the article" },
                    },
                    required: ["facts", "summary"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "submit_facts" } },
          }),
        });

        if (!factResponse.ok) {
          if (factResponse.status === 429) {
            errors.push(`Rate limited on article ${article.id}`);
            continue;
          }
          if (factResponse.status === 402) {
            errors.push("Payment required for AI gateway");
            break;
          }
          const t = await factResponse.text();
          errors.push(`AI error for ${article.id}: ${factResponse.status} ${t}`);
          continue;
        }

        const factResult = await factResponse.json();
        const toolCall = factResult.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          errors.push(`No tool call returned for article ${article.id}`);
          // Mark as processed anyway to avoid infinite retries
          await supabase.from("articles").update({ processed: true }).eq("id", article.id);
          continue;
        }

        const extracted = JSON.parse(toolCall.function.arguments);
        const facts = extracted.facts || [];
        const summary = extracted.summary || "";

        // Collect syllabus tags from all facts for the article
        const articleTags = [...new Set(facts.flatMap((f: any) => f.syllabus_tags))];

        // Update article
        await supabase.from("articles").update({
          processed: true,
          summary,
          syllabus_tags: articleTags,
        }).eq("id", article.id);

        if (facts.length === 0) continue;

        // Insert facts
        const factRows = facts.map((f: any) => ({
          article_id: article.id,
          fact_text: f.fact_text,
          source_url: article.source_url,
          syllabus_tags: f.syllabus_tags,
          confidence: f.confidence,
        }));

        const { data: insertedFacts, error: factInsertErr } = await supabase
          .from("facts")
          .insert(factRows)
          .select("id, fact_text, syllabus_tags");

        if (factInsertErr) {
          errors.push(`Fact insert error for ${article.id}: ${factInsertErr.message}`);
          continue;
        }

        totalFacts += insertedFacts.length;

        // ──── STEP 2: Generate MCQs from facts ────
        const mcqPrompt = `You are a UPSC Prelims MCQ generator. Generate one high-quality MCQ for each fact below.

FACTS (from ${article.source_name}):
${insertedFacts.map((f: any, i: number) => `${i + 1}. ${f.fact_text}`).join("\n")}

RULES:
- Each MCQ must test understanding of the fact, not just recall
- Use UPSC-style formats: statement-based ("Consider the following..."), direct questions, or assertion-reason
- 4 options each, exactly 1 correct
- Explanation must reference the source fact
- Difficulty: easy/medium/hard based on how nuanced the fact is
- FACT SAFETY: The correct answer and explanation must be directly supported by the source fact`;

        const mcqResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You generate UPSC-format MCQs. Return structured data via tool calls." },
              { role: "user", content: mcqPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "submit_mcqs",
                  description: "Submit generated MCQs",
                  parameters: {
                    type: "object",
                    properties: {
                      mcqs: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            question: { type: "string" },
                            statements: { type: "array", items: { type: "string" }, description: "Optional statement list for statement-based questions" },
                            options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                            correct_index: { type: "integer", minimum: 0, maximum: 3 },
                            explanation: { type: "string" },
                            difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                            fact_index: { type: "integer", description: "0-based index of the source fact" },
                          },
                          required: ["question", "options", "correct_index", "explanation", "difficulty", "fact_index"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["mcqs"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "submit_mcqs" } },
          }),
        });

        if (!mcqResponse.ok) {
          const t = await mcqResponse.text();
          errors.push(`MCQ AI error for ${article.id}: ${mcqResponse.status} ${t}`);
          continue;
        }

        const mcqResult = await mcqResponse.json();
        const mcqToolCall = mcqResult.choices?.[0]?.message?.tool_calls?.[0];
        if (!mcqToolCall) {
          errors.push(`No MCQ tool call for article ${article.id}`);
          continue;
        }

        const mcqData = JSON.parse(mcqToolCall.function.arguments);
        const mcqs = mcqData.mcqs || [];

        const mcqRows = mcqs.map((m: any) => {
          const factIdx = m.fact_index ?? 0;
          const sourceFact = insertedFacts[factIdx] || insertedFacts[0];
          return {
            question: m.question,
            statements: m.statements || null,
            options: m.options,
            correct_index: m.correct_index,
            explanation: m.explanation,
            topic: sourceFact?.syllabus_tags?.[0] || articleTags[0] || "General",
            difficulty: m.difficulty,
            source: article.source_name,
            source_url: article.source_url,
            fact_id: sourceFact?.id || null,
            article_id: article.id,
            syllabus_tags: sourceFact?.syllabus_tags || articleTags,
            is_daily_eligible: true,
            is_verified: false,
          };
        });

        if (mcqRows.length > 0) {
          const { error: mcqInsertErr } = await supabase.from("mcq_bank").insert(mcqRows);
          if (mcqInsertErr) {
            errors.push(`MCQ insert error: ${mcqInsertErr.message}`);
          } else {
            totalMCQs += mcqRows.length;
          }
        }
      } catch (articleErr) {
        errors.push(`Article ${article.id}: ${articleErr instanceof Error ? articleErr.message : "Unknown"}`);
        // Mark as processed to avoid stuck retries
        await supabase.from("articles").update({ processed: true }).eq("id", article.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        articles_processed: articles.length,
        facts_extracted: totalFacts,
        mcqs_generated: totalMCQs,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-content error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
