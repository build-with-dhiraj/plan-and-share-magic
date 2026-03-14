import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface PYQRequest {
  source_url: string;
  year: number;
  exam_stage: "prelims" | "mains";
  paper_code: string;
  source_id?: string;
  key_url?: string;
  manual_text?: string;
}

interface ParsedQuestion {
  question_number: number;
  question_text: string;
  raw_question_text: string;
  question_type: "mcq" | "descriptive" | "statement_based";
  marks: number | null;
  word_limit: number | null;
  raw_source_page: number | null;
  options: { label: string; text: string }[];
  confidence_score: number;
  parse_quality: "good" | "partial" | "poor";
}

interface ParseEvent {
  event_type: string;
  detail: string;
  timestamp: string;
}

// ═══════════════════════════════════════════
// PDF text extraction (raw binary approach)
// ═══════════════════════════════════════════

/**
 * Attempt to extract readable text from a PDF's raw bytes.
 *
 * PDF text is stored inside BT...ET (Begin Text / End Text) blocks.
 * Within those blocks, literal strings appear inside parentheses and
 * hex strings inside angle brackets.  This function pulls both forms
 * and concatenates them, which works well for "simple" PDFs (most
 * government exam papers) but will miss text in CIDFont / ToUnicode
 * streams.
 */
function extractTextFromPdfBytes(bytes: Uint8Array): string {
  // Convert to a latin-1 string so we can regex over it.
  // (PDF is fundamentally a byte format, not UTF-8.)
  let raw = "";
  for (let i = 0; i < bytes.length; i++) {
    raw += String.fromCharCode(bytes[i]);
  }

  const textChunks: string[] = [];

  // Strategy 1: Extract text between BT / ET markers
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let btMatch;
  while ((btMatch = btEtRegex.exec(raw)) !== null) {
    const block = btMatch[1];

    // Literal strings in parentheses — handle escaped parens
    const parenRegex = /\(([^)]*(?:\\\)[^)]*)*)\)/g;
    let pm;
    while ((pm = parenRegex.exec(block)) !== null) {
      let s = pm[1];
      // Unescape PDF escape sequences
      s = s.replace(/\\n/g, "\n");
      s = s.replace(/\\r/g, "\r");
      s = s.replace(/\\t/g, "\t");
      s = s.replace(/\\\(/g, "(");
      s = s.replace(/\\\)/g, ")");
      s = s.replace(/\\\\/g, "\\");
      if (s.trim()) textChunks.push(s);
    }

    // Hex strings in angle brackets  e.g. <48656C6C6F>
    const hexRegex = /<([0-9A-Fa-f\s]+)>/g;
    let hm;
    while ((hm = hexRegex.exec(block)) !== null) {
      const hex = hm[1].replace(/\s/g, "");
      let decoded = "";
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.substring(i, i + 2), 16);
        if (code >= 32 && code < 127) {
          decoded += String.fromCharCode(code);
        } else if (code === 10 || code === 13) {
          decoded += "\n";
        }
      }
      if (decoded.trim()) textChunks.push(decoded);
    }
  }

  // Strategy 2: If BT/ET yielded nothing, try stream-level text extraction
  if (textChunks.length === 0) {
    // Look for parenthesized strings outside BT/ET (some PDFs inline them)
    const globalParenRegex = /\(([^)]{4,})\)/g;
    let gm;
    while ((gm = globalParenRegex.exec(raw)) !== null) {
      let s = gm[1];
      s = s.replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
      // Filter out binary noise — only keep if mostly printable ASCII
      const printable = s.split("").filter(
        (c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127
      ).length;
      if (printable / s.length > 0.7 && s.trim().length > 3) {
        textChunks.push(s);
      }
    }
  }

  return textChunks.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Download a PDF and extract its text content.
 * Returns the extracted text or null on failure.
 */
async function downloadAndExtractPdf(
  url: string,
  events: ParseEvent[]
): Promise<string | null> {
  try {
    events.push({
      event_type: "pdf_download_start",
      detail: `Fetching PDF from ${url}`,
      timestamp: new Date().toISOString(),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      events.push({
        event_type: "pdf_download_error",
        detail: `HTTP ${resp.status} for ${url}`,
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    const arrayBuffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    events.push({
      event_type: "pdf_download_complete",
      detail: `Downloaded ${bytes.length} bytes`,
      timestamp: new Date().toISOString(),
    });

    // Verify it's actually a PDF
    const header = String.fromCharCode(...bytes.slice(0, 5));
    if (header !== "%PDF-") {
      events.push({
        event_type: "pdf_invalid",
        detail: `File does not start with %PDF- header (got: ${header})`,
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    const text = extractTextFromPdfBytes(bytes);

    events.push({
      event_type: "pdf_text_extracted",
      detail: `Extracted ${text.length} characters from raw PDF`,
      timestamp: new Date().toISOString(),
    });

    if (text.length < 50) {
      // PDF might be scanned/image-based — try Jina Reader as fallback
      events.push({
        event_type: "pdf_text_too_short",
        detail: `Only ${text.length} chars extracted, trying Jina Reader fallback`,
        timestamp: new Date().toISOString(),
      });

      try {
        const jinaController = new AbortController();
        const jinaTimeout = setTimeout(() => jinaController.abort(), 20000);
        const jinaResp = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            Accept: "application/json",
            "X-No-Cache": "true",
            "X-Return-Format": "text",
          },
          signal: jinaController.signal,
        });
        clearTimeout(jinaTimeout);

        if (jinaResp.ok) {
          const jinaRaw = await jinaResp.text();
          let jinaText = "";
          try {
            const json = JSON.parse(jinaRaw);
            jinaText = json.data?.content || json.content || json.text || "";
          } catch {
            jinaText = jinaRaw;
          }

          if (jinaText.length > 100) {
            events.push({
              event_type: "pdf_jina_fallback_success",
              detail: `Jina extracted ${jinaText.length} characters`,
              timestamp: new Date().toISOString(),
            });
            return jinaText;
          }
        }
      } catch (e) {
        events.push({
          event_type: "pdf_jina_fallback_error",
          detail: `Jina fallback failed: ${e instanceof Error ? e.message : "Unknown"}`,
          timestamp: new Date().toISOString(),
        });
      }

      return text.length > 0 ? text : null;
    }

    return text;
  } catch (e) {
    events.push({
      event_type: "pdf_download_exception",
      detail: `${e instanceof Error ? e.message : "Unknown error"}`,
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

// ═══════════════════════════════════════════
// Question parsing — Prelims (MCQ)
// ═══════════════════════════════════════════

/**
 * Detect and split prelims questions from extracted text.
 *
 * Prelims patterns:
 *   - "Q.1." or "Q1." or "1." followed by question text
 *   - Options: (a), (b), (c), (d) or a), b), c), d) or (1), (2), (3), (4)
 *   - Statement-based: "Consider the following statements:"
 *   - "Which of the following" / "Which of the above"
 */
function parsePrelimsQuestions(text: string, events: ParseEvent[]): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  // Normalize whitespace but preserve newlines
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  // Split into question blocks using question number patterns
  // Match: "Q.1." or "Q1." or "Q. 1." or "1." at line start (with possible leading whitespace)
  const questionSplitRegex = /(?:^|\n)\s*(?:Q\.?\s*(\d+)\.?|(\d+)\s*[.)]\s)/g;

  const splitPoints: { index: number; qNum: number }[] = [];
  let splitMatch;
  while ((splitMatch = questionSplitRegex.exec(normalized)) !== null) {
    const qNum = parseInt(splitMatch[1] || splitMatch[2], 10);
    if (qNum > 0 && qNum <= 200) {
      splitPoints.push({ index: splitMatch.index, qNum });
    }
  }

  if (splitPoints.length === 0) {
    events.push({
      event_type: "parse_no_questions_found",
      detail: "No question boundaries detected in prelims text",
      timestamp: new Date().toISOString(),
    });
    return [];
  }

  events.push({
    event_type: "parse_questions_detected",
    detail: `Found ${splitPoints.length} question boundaries`,
    timestamp: new Date().toISOString(),
  });

  // Extract each question block
  for (let i = 0; i < splitPoints.length; i++) {
    const start = splitPoints[i].index;
    const end = i + 1 < splitPoints.length ? splitPoints[i + 1].index : normalized.length;
    const block = normalized.substring(start, end).trim();
    const qNum = splitPoints[i].qNum;

    // Remove the question number prefix
    const cleaned = block
      .replace(/^\s*Q\.?\s*\d+\.?\s*/, "")
      .replace(/^\s*\d+\s*[.)]\s*/, "")
      .trim();

    if (cleaned.length < 10) continue;

    // Extract options (a), (b), (c), (d)
    const options = extractOptions(cleaned);

    // Determine question type
    let questionType: "mcq" | "statement_based" = "mcq";
    if (
      /consider\s+the\s+following\s+statements?/i.test(cleaned) ||
      /which\s+of\s+the\s+(following|above)\s+statements?\s+(is|are)/i.test(cleaned)
    ) {
      questionType = "statement_based";
    }

    // Extract the question text (without options)
    let questionText = cleaned;
    if (options.length > 0) {
      // Remove everything from the first option onwards
      const firstOptionRegex = /\n?\s*\(?[aA1]\s*[.)]\s/;
      const firstOptionMatch = questionText.match(firstOptionRegex);
      if (firstOptionMatch?.index !== undefined) {
        questionText = questionText.substring(0, firstOptionMatch.index).trim();
      }
    }

    // Calculate confidence
    let confidence = 0.5;
    if (options.length === 4) confidence += 0.3;
    else if (options.length >= 2) confidence += 0.15;
    if (questionText.length > 20) confidence += 0.1;
    if (/\?/.test(questionText)) confidence += 0.1;
    confidence = Math.min(1.0, confidence);

    const parseQuality: "good" | "partial" | "poor" =
      confidence >= 0.8 ? "good" : confidence >= 0.5 ? "partial" : "poor";

    questions.push({
      question_number: qNum,
      question_text: questionText,
      raw_question_text: block,
      question_type: questionType,
      marks: null,
      word_limit: null,
      raw_source_page: null,
      options,
      confidence_score: Math.round(confidence * 100) / 100,
      parse_quality: parseQuality,
    });
  }

  return questions;
}

/**
 * Extract MCQ options from a question block.
 * Handles: (a) text, a) text, (A) text, A) text
 */
function extractOptions(text: string): { label: string; text: string }[] {
  const options: { label: string; text: string }[] = [];

  // Pattern: (a) text or a) text — case insensitive
  const optionRegex = /\(?([a-dA-D1-4])\s*[.)]\s*([^\n]+(?:\n(?!\s*\(?[a-dA-D1-4]\s*[.)])(?!\s*Q\.?\s*\d)(?!\s*\d+\s*[.)]).*)*)/g;
  let om;
  while ((om = optionRegex.exec(text)) !== null) {
    const label = om[1].toLowerCase();
    const optText = om[2].replace(/\s+/g, " ").trim();
    if (optText.length > 0) {
      options.push({ label, text: optText });
    }
  }

  // If we got (1), (2), etc., normalize labels to a, b, c, d
  if (options.length > 0 && /^[1-4]$/.test(options[0].label)) {
    const numToLetter = { "1": "a", "2": "b", "3": "c", "4": "d" } as Record<string, string>;
    for (const opt of options) {
      opt.label = numToLetter[opt.label] || opt.label;
    }
  }

  // Deduplicate — keep only a, b, c, d
  const seen = new Set<string>();
  return options.filter((o) => {
    if (seen.has(o.label)) return false;
    seen.add(o.label);
    return true;
  });
}

// ═══════════════════════════════════════════
// Question parsing — Mains (Descriptive)
// ═══════════════════════════════════════════

/**
 * Detect and split mains questions from extracted text.
 *
 * Mains patterns:
 *   - "Q.1" or "Q1" followed by question text
 *   - Marks: "(15 marks)" or "(15)" or "(15 Marks)"
 *   - Word limit: "(250 words)" or "(in 250 words)"
 *   - SECTION headers: "SECTION-A", "Section B"
 */
function parseMainsQuestions(text: string, events: ParseEvent[]): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  // Split by question numbers — mains typically uses Q.1, Q.2 etc. or Q1(a)
  const questionSplitRegex = /(?:^|\n)\s*(?:Q\.?\s*(\d+)|(\d+)\s*[.)]\s)/g;

  const splitPoints: { index: number; qNum: number }[] = [];
  let splitMatch;
  while ((splitMatch = questionSplitRegex.exec(normalized)) !== null) {
    const qNum = parseInt(splitMatch[1] || splitMatch[2], 10);
    if (qNum > 0 && qNum <= 50) {
      splitPoints.push({ index: splitMatch.index, qNum });
    }
  }

  if (splitPoints.length === 0) {
    events.push({
      event_type: "parse_no_questions_found",
      detail: "No question boundaries detected in mains text",
      timestamp: new Date().toISOString(),
    });
    return [];
  }

  events.push({
    event_type: "parse_questions_detected",
    detail: `Found ${splitPoints.length} question boundaries (mains)`,
    timestamp: new Date().toISOString(),
  });

  for (let i = 0; i < splitPoints.length; i++) {
    const start = splitPoints[i].index;
    const end = i + 1 < splitPoints.length ? splitPoints[i + 1].index : normalized.length;
    const block = normalized.substring(start, end).trim();
    const qNum = splitPoints[i].qNum;

    // Remove question number prefix
    const cleaned = block
      .replace(/^\s*Q\.?\s*\d+\.?\s*/, "")
      .replace(/^\s*\d+\s*[.)]\s*/, "")
      .trim();

    if (cleaned.length < 10) continue;

    // Extract marks: (15 marks) or (15) or (15 Marks)
    let marks: number | null = null;
    const marksMatch = cleaned.match(/\((\d+)\s*(?:marks?|Marks?)?\s*\)/i);
    if (marksMatch) {
      marks = parseInt(marksMatch[1], 10);
    }

    // Extract word limit: (250 words) or (in 250 words)
    let wordLimit: number | null = null;
    const wordLimitMatch = cleaned.match(/\(?(?:in\s+)?(\d+)\s*words?\s*\)?/i);
    if (wordLimitMatch) {
      wordLimit = parseInt(wordLimitMatch[1], 10);
      // Sanity: word limits are typically 150, 200, 250
      if (wordLimit < 50 || wordLimit > 1000) wordLimit = null;
    }

    // Clean the question text — remove marks/word limit annotations
    let questionText = cleaned
      .replace(/\(\d+\s*(?:marks?|Marks?)\s*\)/gi, "")
      .replace(/\(?(?:in\s+)?\d+\s*words?\s*\)?/gi, "")
      .trim();

    // Calculate confidence
    let confidence = 0.4;
    if (questionText.length > 30) confidence += 0.2;
    if (marks !== null) confidence += 0.2;
    if (wordLimit !== null) confidence += 0.1;
    if (/\?/.test(questionText) || /discuss|examine|analyze|evaluate|comment/i.test(questionText)) {
      confidence += 0.1;
    }
    confidence = Math.min(1.0, confidence);

    const parseQuality: "good" | "partial" | "poor" =
      confidence >= 0.8 ? "good" : confidence >= 0.5 ? "partial" : "poor";

    questions.push({
      question_number: qNum,
      question_text: questionText,
      raw_question_text: block,
      question_type: "descriptive",
      marks,
      word_limit: wordLimit,
      raw_source_page: null,
      options: [],
      confidence_score: Math.round(confidence * 100) / 100,
      parse_quality: parseQuality,
    });
  }

  return questions;
}

// ═══════════════════════════════════════════
// Answer key parsing
// ═══════════════════════════════════════════

/**
 * Parse an answer key from text content.
 * Expected formats:
 *   1. a      or     1-a     or     1.a     or     1) a
 *   Q.1 (a)  or     Q1: a
 */
function parseAnswerKey(text: string, events: ParseEvent[]): Map<number, string> {
  const answers = new Map<number, string>();

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ");

  // Pattern: various question-number-to-answer formats
  const patterns = [
    // "1. a" or "1.a" or "1) a" or "1 a"
    /(?:^|\n)\s*(\d+)\s*[.):\-]?\s*\(?([a-dA-D])\)?/g,
    // "Q.1 (a)" or "Q1: a"
    /Q\.?\s*(\d+)\s*[.:)]\s*\(?([a-dA-D])\)?/gi,
  ];

  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(normalized)) !== null) {
      const qNum = parseInt(m[1], 10);
      const answer = m[2].toLowerCase();
      if (qNum > 0 && qNum <= 200 && !answers.has(qNum)) {
        answers.set(qNum, answer);
      }
    }
  }

  events.push({
    event_type: "answer_key_parsed",
    detail: `Extracted ${answers.size} answer mappings`,
    timestamp: new Date().toISOString(),
  });

  return answers;
}

// ═══════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Track parse events for audit log
  const events: ParseEvent[] = [];
  let jobId: string | null = null;

  try {
    // ──── Parse request body ────
    const body: PYQRequest = await req.json();
    const {
      source_url,
      year,
      exam_stage,
      paper_code,
      source_id,
      key_url,
      manual_text,
    } = body;

    // Validate required fields
    if (!source_url || !year || !exam_stage || !paper_code) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: source_url, year, exam_stage, paper_code",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (exam_stage !== "prelims" && exam_stage !== "mains") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "exam_stage must be 'prelims' or 'mains'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    events.push({
      event_type: "job_started",
      detail: `PYQ ingest: ${exam_stage} ${year} ${paper_code} from ${source_url}`,
      timestamp: new Date().toISOString(),
    });

    console.log(`PYQ ingest: ${exam_stage} ${year} ${paper_code}`);

    // ──── Create import job record ────
    const { data: job, error: jobError } = await supabase
      .from("pyq_import_jobs")
      .insert({
        source_url,
        year,
        exam_stage,
        paper_code,
        source_id: source_id || null,
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobError) {
      console.error("Failed to create import job:", jobError.message);
      events.push({
        event_type: "job_create_error",
        detail: jobError.message,
        timestamp: new Date().toISOString(),
      });
      // Continue without job tracking rather than failing entirely
    } else {
      jobId = job.id;
    }

    // ──── Get the text content ────
    let rawText: string | null = null;

    if (manual_text && manual_text.trim().length > 0) {
      // Use pre-extracted text
      rawText = manual_text.trim();
      events.push({
        event_type: "manual_text_provided",
        detail: `Using manual_text (${rawText.length} characters)`,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Download and extract from PDF
      rawText = await downloadAndExtractPdf(source_url, events);
    }

    if (!rawText || rawText.length < 50) {
      const errorMsg = "Could not extract sufficient text from PDF";
      events.push({
        event_type: "extraction_failed",
        detail: errorMsg,
        timestamp: new Date().toISOString(),
      });

      // Update job status
      if (jobId) {
        await supabase
          .from("pyq_import_jobs")
          .update({
            status: "failed",
            error_message: errorMsg,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      // Log parse events
      await logParseEvents(supabase, jobId, events);

      return new Response(
        JSON.stringify({ success: false, error: errorMsg, events }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Extracted ${rawText.length} characters of text`);

    // ──── Create document record ────
    const { data: doc, error: docError } = await supabase
      .from("pyq_documents")
      .insert({
        source_id: source_id || null,
        year,
        exam_stage,
        paper_code,
        source_url,
        raw_text: rawText,
        import_job_id: jobId,
      })
      .select("id")
      .single();

    if (docError) {
      throw new Error(`Failed to create document record: ${docError.message}`);
    }

    const documentId = doc.id;

    events.push({
      event_type: "document_created",
      detail: `Document ID: ${documentId}`,
      timestamp: new Date().toISOString(),
    });

    // ──── Parse questions ────
    let parsedQuestions: ParsedQuestion[];

    if (exam_stage === "prelims") {
      parsedQuestions = parsePrelimsQuestions(rawText, events);
    } else {
      parsedQuestions = parseMainsQuestions(rawText, events);
    }

    events.push({
      event_type: "parsing_complete",
      detail: `Parsed ${parsedQuestions.length} questions`,
      timestamp: new Date().toISOString(),
    });

    console.log(`Parsed ${parsedQuestions.length} questions`);

    if (parsedQuestions.length === 0) {
      const errorMsg = "No questions could be parsed from the text";
      events.push({
        event_type: "parsing_empty",
        detail: errorMsg,
        timestamp: new Date().toISOString(),
      });

      if (jobId) {
        await supabase
          .from("pyq_import_jobs")
          .update({
            status: "completed_with_warnings",
            error_message: errorMsg,
            questions_parsed: 0,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      await logParseEvents(supabase, jobId, events);

      return new Response(
        JSON.stringify({
          success: true,
          warning: errorMsg,
          document_id: documentId,
          questions_parsed: 0,
          events,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──── Insert questions ────
    let questionsInserted = 0;
    let optionsInserted = 0;
    const questionIdMap = new Map<number, string>(); // qNum -> question UUID

    for (const q of parsedQuestions) {
      const { data: inserted, error: insertErr } = await supabase
        .from("pyq_questions")
        .insert({
          document_id: documentId,
          year,
          exam_stage,
          paper_code,
          question_number: q.question_number,
          question_text: q.question_text,
          raw_question_text: q.raw_question_text,
          question_type: q.question_type,
          marks: q.marks,
          word_limit: q.word_limit,
          raw_source_page: q.raw_source_page,
          is_published: false,
          verification_status: "auto_parsed",
          parse_quality: q.parse_quality,
          human_reviewed: false,
          confidence_score: q.confidence_score,
        })
        .select("id")
        .single();

      if (insertErr) {
        events.push({
          event_type: "question_insert_error",
          detail: `Q${q.question_number}: ${insertErr.message}`,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      questionsInserted++;
      questionIdMap.set(q.question_number, inserted.id);

      // Insert options for prelims questions
      if (exam_stage === "prelims" && q.options.length > 0) {
        const optionRows = q.options.map((opt, idx) => ({
          question_id: inserted.id,
          option_label: opt.label,
          option_text: opt.text,
          sort_order: idx,
        }));

        const { error: optErr } = await supabase
          .from("pyq_prelims_options")
          .insert(optionRows);

        if (optErr) {
          events.push({
            event_type: "option_insert_error",
            detail: `Q${q.question_number} options: ${optErr.message}`,
            timestamp: new Date().toISOString(),
          });
        } else {
          optionsInserted += optionRows.length;
        }
      }
    }

    events.push({
      event_type: "questions_inserted",
      detail: `${questionsInserted} questions, ${optionsInserted} options inserted`,
      timestamp: new Date().toISOString(),
    });

    console.log(`Inserted ${questionsInserted} questions, ${optionsInserted} options`);

    // ──── Parse answer key if provided ────
    let keysInserted = 0;

    if (key_url && exam_stage === "prelims") {
      events.push({
        event_type: "answer_key_start",
        detail: `Fetching answer key from ${key_url}`,
        timestamp: new Date().toISOString(),
      });

      let keyText: string | null = null;

      // Download and extract key PDF
      keyText = await downloadAndExtractPdf(key_url, events);

      if (keyText && keyText.length > 10) {
        const answerMap = parseAnswerKey(keyText, events);

        for (const [qNum, answerLabel] of answerMap) {
          const questionId = questionIdMap.get(qNum);
          if (!questionId) continue;

          const { error: keyErr } = await supabase
            .from("pyq_prelims_keys")
            .insert({
              question_id: questionId,
              answer_label: answerLabel,
              key_source: "official_pdf",
              is_official: true,
              source_url: key_url,
            });

          if (keyErr) {
            events.push({
              event_type: "key_insert_error",
              detail: `Q${qNum}: ${keyErr.message}`,
              timestamp: new Date().toISOString(),
            });
          } else {
            keysInserted++;
          }
        }

        events.push({
          event_type: "answer_keys_inserted",
          detail: `${keysInserted} answer keys inserted`,
          timestamp: new Date().toISOString(),
        });

        console.log(`Inserted ${keysInserted} answer keys`);
      } else {
        events.push({
          event_type: "answer_key_extraction_failed",
          detail: "Could not extract text from answer key PDF",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ──── Calculate overall stats ────
    const goodCount = parsedQuestions.filter((q) => q.parse_quality === "good").length;
    const partialCount = parsedQuestions.filter((q) => q.parse_quality === "partial").length;
    const poorCount = parsedQuestions.filter((q) => q.parse_quality === "poor").length;
    const avgConfidence =
      parsedQuestions.reduce((sum, q) => sum + q.confidence_score, 0) / parsedQuestions.length;

    // ──── Update job status ────
    if (jobId) {
      await supabase
        .from("pyq_import_jobs")
        .update({
          status: "completed",
          document_id: documentId,
          questions_parsed: questionsInserted,
          questions_good: goodCount,
          questions_partial: partialCount,
          questions_poor: poorCount,
          avg_confidence: Math.round(avgConfidence * 100) / 100,
          keys_parsed: keysInserted,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    // ──── Log all parse events ────
    await logParseEvents(supabase, jobId, events);

    // ──── Return results ────
    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        document_id: documentId,
        questions_parsed: questionsInserted,
        options_inserted: optionsInserted,
        keys_inserted: keysInserted,
        parse_quality: {
          good: goodCount,
          partial: partialCount,
          poor: poorCount,
          avg_confidence: Math.round(avgConfidence * 100) / 100,
        },
        events,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown error";
    console.error("pyq-ingest error:", errorMsg);

    events.push({
      event_type: "fatal_error",
      detail: errorMsg,
      timestamp: new Date().toISOString(),
    });

    // Update job status on failure
    if (jobId) {
      await supabase
        .from("pyq_import_jobs")
        .update({
          status: "failed",
          error_message: errorMsg,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    // Log events even on failure
    await logParseEvents(supabase, jobId, events);

    return new Response(
      JSON.stringify({ success: false, error: errorMsg, job_id: jobId, events }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

/**
 * Persist all parse events to the pyq_parse_events table.
 */
async function logParseEvents(
  supabase: ReturnType<typeof createClient>,
  jobId: string | null,
  events: ParseEvent[]
): Promise<void> {
  if (events.length === 0) return;

  try {
    const rows = events.map((e) => ({
      import_job_id: jobId,
      event_type: e.event_type,
      detail: e.detail,
      created_at: e.timestamp,
    }));

    const { error } = await supabase.from("pyq_parse_events").insert(rows);
    if (error) {
      console.error("Failed to log parse events:", error.message);
    }
  } catch (e) {
    console.error("Exception logging parse events:", e);
  }
}
