import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Drishti-style 3-step pipeline v2 — triage, extract, MCQ
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYLLABUS_TOPICS = [
  "Polity",
  "Economy",
  "Geography",
  "Environment",
  "History",
  "Science",
  "IR",
  "Society",
  "Ethics",
  "Art & Culture",
];

// Junk article detection — reject error pages the scraper picked up
const JUNK_PATTERNS = [
  /^404\b/i,
  /not\s*found/i,
  /^403\b/i,
  /^500\b/i,
  /access\s*denied/i,
  /forbidden/i,
  /page\s*(not|unavailable)/i,
  /error\s*page/i,
  /server\s*error/i,
  /sorry.*inconvenience/i,
  /under\s*maintenance/i,
  /^just a moment/i,
  /cloudflare/i,
  /captcha/i,
  /blocked/i,
  /^\s*$/,
  /^untitled$/i,
];
function isJunkArticle(title: string, content: string | null): boolean {
  if (!title || title.trim().length < 5) return true;
  if (JUNK_PATTERNS.some((p) => p.test(title.trim()))) return true;
  if (content) {
    const lower = content.toLowerCase();
    if (lower.includes("404 not found") || lower.includes("page not found") || lower.includes("access denied"))
      return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse optional batch_size from body (increased defaults: 15 default, 30 max)
    let batchSize = 15;
    try {
      const body = await req.json();
      if (body?.batch_size) batchSize = Math.min(body.batch_size, 30);
    } catch {
      /* no body is fine */
    }

    // Fetch unprocessed articles
    const { data: articles, error: fetchErr } = await supabase
      .from("articles")
      .select("*")
      .eq("processed", false)
      .order("ingested_at", { ascending: true })
      .limit(batchSize);

    if (fetchErr) throw fetchErr;
    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "No unprocessed articles" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalFacts = 0;
    let totalMCQs = 0;
    let triaged = 0;
    let lowRelevance = 0;
    const errors: string[] = [];

    for (const article of articles) {
      try {
        // ──── JUNK DETECTION: Skip and delete error pages ────
        if (isJunkArticle(article.title, article.content)) {
          console.log(`Deleting junk article: "${article.title}" (${article.id})`);
          await supabase.from("facts").delete().eq("article_id", article.id);
          await supabase.from("mcq_bank").delete().eq("article_id", article.id);
          await supabase.from("articles").delete().eq("id", article.id);
          errors.push(`Deleted junk article: ${article.title}`);
          continue;
        }

        // ──── STEP 1: TRIAGE — Score UPSC relevance ────
        const triagePrompt = `You are a UPSC Civil Services exam content curator. Evaluate this article for UPSC relevance.

ARTICLE TITLE: ${article.title}
SOURCE: ${article.source_name}
CONTENT (first 500 chars): ${(article.content || article.title).slice(0, 500)}

Score the article's UPSC relevance from 0.0 to 1.0:
- 0.0-0.2: No UPSC relevance (local crime, entertainment, sports scores, obituaries)
- 0.3-0.4: Marginal relevance (general awareness only)
- 0.5-0.6: Moderate relevance (useful for one GS paper)
- 0.7-0.8: High relevance (important policy, scheme, judgment, report)
- 0.9-1.0: Critical (landmark policy, constitutional matter, international treaty)

Also assign a depth_tier:
- "deep_analysis": Score >= 0.7, topic warrants detailed analysis with multiple sections
- "important_facts": Score 0.4-0.69, key facts worth noting but doesn't need deep dive
- "rapid_fire": Score 0.3-0.39, one-liner awareness level`;

        const triageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You triage news articles for UPSC relevance. Return structured data via tool calls.",
              },
              { role: "user", content: triagePrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "submit_triage",
                  description: "Submit UPSC relevance triage result",
                  parameters: {
                    type: "object",
                    properties: {
                      upsc_relevance: { type: "number", description: "0.0-1.0 relevance score" },
                      depth_tier: {
                        type: "string",
                        enum: ["deep_analysis", "important_facts", "rapid_fire"],
                        description: "Content depth tier",
                      },
                      reasoning: { type: "string", description: "Brief reason for the score" },
                    },
                    required: ["upsc_relevance", "depth_tier", "reasoning"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "submit_triage" } },
          }),
        });

        if (!triageResponse.ok) {
          if (triageResponse.status === 429) {
            errors.push(`Rate limited on triage for ${article.id}`);
            continue;
          }
          if (triageResponse.status === 402) {
            errors.push("Payment required for AI gateway");
            break;
          }
          const t = await triageResponse.text();
          errors.push(`Triage AI error for ${article.id}: ${triageResponse.status} ${t}`);
          continue;
        }

        const triageResult = await triageResponse.json();
        const triageToolCall = triageResult.choices?.[0]?.message?.tool_calls?.[0];
        if (!triageToolCall) {
          errors.push(`No triage tool call for article ${article.id}`);
          await supabase.from("articles").update({ processed: true, upsc_relevance: 0 }).eq("id", article.id);
          continue;
        }

        const triage = JSON.parse(triageToolCall.function.arguments);
        const relevance = Math.max(0, Math.min(1, Number(triage.upsc_relevance) || 0));
        const depthTier = triage.depth_tier || "rapid_fire";
        triaged++;

        // Articles below 0.3 relevance → mark processed, skip AI generation
        if (relevance < 0.3) {
          console.log(`Low relevance (${relevance}): "${article.title}"`);
          await supabase
            .from("articles")
            .update({
              processed: true,
              upsc_relevance: relevance,
              depth_tier: depthTier,
            })
            .eq("id", article.id);
          lowRelevance++;
          continue;
        }

        // ──── STEP 2: STRUCTURED EXTRACTION — Full Drishti skeleton ────
        const extractPrompt = `You are a UPSC Civil Services content creator producing Drishti IAS-style study material.

ARTICLE TITLE: ${article.title}
SOURCE: ${article.source_name} (${article.source_url})
CONTENT: ${article.content || article.title}
DEPTH TIER: ${depthTier}
UPSC RELEVANCE: ${relevance}

Generate comprehensive UPSC study material:

1. **summary**: 2-3 bullet points for "Why in News" section
2. **prelims_keywords**: Key terms, schemes, reports, bodies mentioned (for quick Prelims revision)
3. **mains_angle**: A paragraph on "Why this matters for Mains" — connect to governance, policy, rights, development
4. **mains_question**: One practice Mains question (e.g., "Examine the structural factors..." or "Critically analyze...")
5. **detailed_analysis**: Array of {heading, content} sections. For deep_analysis: 4-6 sections. For important_facts: 2-3 sections. For rapid_fire: 1 section.
6. **conclusion**: 1-2 sentence synthesis/way forward
7. **faqs**: 3-5 Q&A pairs for quick revision
8. **gs_papers**: Which GS papers this maps to (GS-1, GS-2, GS-3, GS-4)
9. **syllabus_tags**: Specific UPSC syllabus sub-topics from: ${SYLLABUS_TOPICS.join(", ")}
10. **facts**: 2-5 factual statements for Prelims (each with syllabus_tags and confidence 0.5-1.0)

IMPORTANT: All content must be directly derived from the article. No hallucination.`;

        const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You produce UPSC study material in Drishti IAS style. Return structured data via tool calls.",
              },
              { role: "user", content: extractPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "submit_content",
                  description: "Submit structured UPSC study content",
                  parameters: {
                    type: "object",
                    properties: {
                      summary: { type: "string", description: "2-3 bullet 'Why in News' summary" },
                      prelims_keywords: {
                        type: "array",
                        items: { type: "string" },
                        description: "Key terms for Prelims",
                      },
                      mains_angle: { type: "string", description: "Why this matters for Mains paragraph" },
                      mains_question: { type: "string", description: "One practice Mains question" },
                      detailed_analysis: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            heading: { type: "string" },
                            content: { type: "string" },
                          },
                          required: ["heading", "content"],
                          additionalProperties: false,
                        },
                        description: "Structured analysis sections",
                      },
                      conclusion: { type: "string", description: "1-2 sentence synthesis" },
                      faqs: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            question: { type: "string" },
                            answer: { type: "string" },
                          },
                          required: ["question", "answer"],
                          additionalProperties: false,
                        },
                        description: "3-5 FAQ pairs",
                      },
                      gs_papers: {
                        type: "array",
                        items: { type: "string", enum: ["GS-1", "GS-2", "GS-3", "GS-4"] },
                        description: "Applicable GS papers",
                      },
                      syllabus_tags: { type: "array", items: { type: "string" }, description: "UPSC syllabus topics" },
                      facts: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            fact_text: { type: "string" },
                            syllabus_tags: { type: "array", items: { type: "string" } },
                            confidence: { type: "number" },
                          },
                          required: ["fact_text", "syllabus_tags", "confidence"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: [
                      "summary",
                      "prelims_keywords",
                      "mains_angle",
                      "mains_question",
                      "detailed_analysis",
                      "conclusion",
                      "faqs",
                      "gs_papers",
                      "syllabus_tags",
                      "facts",
                    ],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "submit_content" } },
          }),
        });

        if (!extractResponse.ok) {
          if (extractResponse.status === 429) {
            errors.push(`Rate limited on extraction for ${article.id}`);
            continue;
          }
          if (extractResponse.status === 402) {
            errors.push("Payment required for AI gateway");
            break;
          }
          const t = await extractResponse.text();
          errors.push(`Extraction AI error for ${article.id}: ${extractResponse.status} ${t}`);
          continue;
        }

        const extractResult = await extractResponse.json();
        const extractToolCall = extractResult.choices?.[0]?.message?.tool_calls?.[0];
        if (!extractToolCall) {
          errors.push(`No extraction tool call for article ${article.id}`);
          await supabase
            .from("articles")
            .update({ processed: true, upsc_relevance: relevance, depth_tier: depthTier })
            .eq("id", article.id);
          continue;
        }

        const extracted = JSON.parse(extractToolCall.function.arguments);
        const facts = extracted.facts || [];
        const summary = extracted.summary || "";

        // Update article with all Drishti-style fields
        await supabase
          .from("articles")
          .update({
            processed: true,
            summary,
            syllabus_tags: extracted.syllabus_tags || [],
            upsc_relevance: relevance,
            depth_tier: depthTier,
            prelims_keywords: extracted.prelims_keywords || [],
            mains_angle: extracted.mains_angle || null,
            mains_question: extracted.mains_question || null,
            detailed_analysis: extracted.detailed_analysis || null,
            conclusion: extracted.conclusion || null,
            faqs: extracted.faqs || null,
            gs_papers: extracted.gs_papers || [],
          })
          .eq("id", article.id);

        // Insert facts
        if (facts.length > 0) {
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
          } else {
            totalFacts += insertedFacts.length;

            // ──── STEP 3: MCQ GENERATION ────
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
                                statements: {
                                  type: "array",
                                  items: { type: "string" },
                                  description: "Optional statement list for statement-based questions",
                                },
                                options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                                correct_index: { type: "integer", minimum: 0, maximum: 3 },
                                explanation: { type: "string" },
                                difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                                fact_index: { type: "integer", description: "0-based index of the source fact" },
                              },
                              required: [
                                "question",
                                "options",
                                "correct_index",
                                "explanation",
                                "difficulty",
                                "fact_index",
                              ],
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
            } else {
              const mcqResult = await mcqResponse.json();
              const mcqToolCall = mcqResult.choices?.[0]?.message?.tool_calls?.[0];
              if (!mcqToolCall) {
                errors.push(`No MCQ tool call for article ${article.id}`);
              } else {
                const mcqData = JSON.parse(mcqToolCall.function.arguments);
                const mcqs = mcqData.mcqs || [];
                const articleTags = extracted.syllabus_tags || [];

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
              }
            }
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
        triaged,
        low_relevance_skipped: lowRelevance,
        facts_extracted: totalFacts,
        mcqs_generated: totalMCQs,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("process-content error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
