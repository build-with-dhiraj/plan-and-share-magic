import { cn } from "./utils";

// ── Canonical GS Tag type ───────────────────────────────────────
export type GsTag =
  | "polity"
  | "economy"
  | "environment"
  | "ir"
  | "science"
  | "ethics"
  | "essay"
  | "history"
  | "geography"
  | "society";

// ── 3-Level Taxonomy ────────────────────────────────────────────
// Level 1: GS Paper
// Level 2: Canonical Subject (the GsTag enum above)
// Level 3: Sub-topic (used for search/filtering, not display)

export const GS_PAPER_FOR_SUBJECT: Record<GsTag, string> = {
  history: "GS-1",
  geography: "GS-1",
  society: "GS-1",
  polity: "GS-2",
  ir: "GS-2",
  economy: "GS-3",
  science: "GS-3",
  environment: "GS-3",
  ethics: "GS-4",
  essay: "Essay",
};

// ── Synonym → Canonical ID mapping ─────────────────────────────
// Collapses abbreviations, full names, and related organizations
// into a single canonical GsTag. Case-insensitive matching.
const SYNONYM_MAP: [RegExp, GsTag][] = [
  // Science & Technology — catch ISRO, S&T, tech orgs
  [/\b(s\s*&\s*t|science|tech|isro|drdo|indian space|biotechnology|nanotechnology|it\s+act|cyber|artificial intelligence|ai\b|machine learning|space\s+research|gaganyaan|chandrayaan|aditya|mangalyaan|semiconductor|quantum|nuclear\s+tech)/i, "science"],
  // Polity & Governance
  [/\b(polity|governance|constitution|amendment|article\s+\d|fundamental\s+rights?|directive\s+principles?|parliament|lok\s+sabha|rajya\s+sabha|supreme\s+court|high\s+court|judiciary|election\s+commission|niti\s+aayog|federalism|panchayati?\s+raj|municipal|local\s+government|governor|president\s+of\s+india|speaker|legislative)/i, "polity"],
  // Economy
  [/\b(economy|economic|rbi|reserve\s+bank|fiscal|monetary|gdp|inflation|budget|taxation|gst|fdi|trade|banking|finance|npa|msme|make\s+in\s+india|startup|disinvestment|subsid|insurance|sebi|stock\s+market)/i, "economy"],
  // Environment & Ecology
  [/\b(environment|ecology|climate|biodiversity|wildlife|forest|pollution|emission|carbon|renewable|solar|wind\s+energy|conservation|wetland|mangrove|coral|national\s+park|sanctuary|ramsar|cop\s*\d|unfccc|paris\s+agreement|green\s+hydrogen)/i, "environment"],
  // International Relations
  [/\b(international\s+relations?|ir\b|foreign\s+policy|bilateral|multilateral|diplomatic|un\b|united\s+nations|nato|asean|quad|brics|g\s*-?\s*[27]0|indo-pacific|geopolitic|treaty|summit|ambassador)/i, "ir"],
  // Ethics & Integrity
  [/\b(ethics|integrity|moral|conscience|empathy|emotional\s+intelligence|aptitude|probity|public\s+service|corruption|whistleblower|rti\b|transparency|accountability|code\s+of\s+conduct)/i, "ethics"],
  // History & Art & Culture
  [/\b(history|historical|ancient|medieval|modern\s+india|freedom\s+struggle|independence\s+movement|mughal|maratha|chola|maurya|gupta|british\s+raj|art\s*&?\s*culture|heritage|monument|unesco|architecture|dance|music|classical|painting|sculpture|festival)/i, "history"],
  // Geography
  [/\b(geography|geographical|topography|geomorphology|climatology|oceanography|monsoon|river|mountain|plateau|plain|soil|mineral|earthquake|volcano|tsunami|plate\s+tectonics|census|urbanization|demographic)/i, "geography"],
  // Society & Social Issues
  [/\b(society|social|caste|tribe|tribal|gender|women|child|education|health|poverty|inequality|migration|communalism|secularism|population|rural|urban\s+development|welfare\s+scheme|empowerment)/i, "society"],
  // Essay
  [/\b(essay)\b/i, "essay"],
];

/**
 * Normalize a single raw tag string into its canonical GsTag.
 * Uses regex-based synonym matching for entity linking.
 * Returns null if no match found.
 */
export function normalizeTag(raw: string): GsTag | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Direct match first (fast path)
  const lower = trimmed.toLowerCase();
  const directMap: Record<string, GsTag> = {
    polity: "polity",
    economy: "economy",
    environment: "environment",
    ecology: "environment",
    ir: "ir",
    "international relations": "ir",
    science: "science",
    "s&t": "science",
    "science & tech": "science",
    "science and technology": "science",
    "art & culture": "history",
    ethics: "ethics",
    history: "history",
    geography: "geography",
    society: "society",
    essay: "essay",
    governance: "polity",
  };

  if (directMap[lower]) return directMap[lower];

  // Regex synonym matching (entity linking)
  for (const [pattern, tag] of SYNONYM_MAP) {
    if (pattern.test(trimmed)) return tag;
  }

  return null;
}

/**
 * Normalize and deduplicate an array of raw tag strings.
 * Returns unique canonical GsTags with no duplicates.
 *
 * This is the core deduplication function that collapses:
 * - "S&T" + "Science" + "ISRO" → ["science"]
 * - "Polity" + "Governance" → ["polity"]
 */
export function normalizeAndDedup(rawTags: string[]): GsTag[] {
  const seen = new Set<GsTag>();
  const result: GsTag[] = [];

  for (const raw of rawTags) {
    const canonical = normalizeTag(raw);
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }

  return result;
}

/**
 * Cross-deduplicate subject tags against GS paper tags.
 * If "GS-3" is already shown as a paper badge, don't also show
 * "Economy" and "Science" as subject tags (they're redundant).
 *
 * Used by IssueCard to avoid visual clutter.
 */
export function dedupeTagsAgainstPapers(
  subjectTags: GsTag[],
  gsPapers: string[]
): GsTag[] {
  if (gsPapers.length === 0) return subjectTags;

  // Map GS papers to their contained subjects
  const papersLower = new Set(gsPapers.map((p) => p.toLowerCase()));

  // Don't filter aggressively — only remove if BOTH the paper AND
  // subject would say the same thing. Keep subjects for specificity.
  return subjectTags.filter((tag) => {
    const paper = GS_PAPER_FOR_SUBJECT[tag]?.toLowerCase();
    // If there's only one paper and one tag, keep the tag for specificity
    if (gsPapers.length === 1 && subjectTags.length === 1) return true;
    // Remove essay if "Essay" paper is shown
    if (tag === "essay" && papersLower.has("essay")) return false;
    return true;
  });
}

// ── Display configuration ───────────────────────────────────────
export const TAG_DISPLAY: Record<GsTag, { label: string; className: string }> = {
  polity: { label: "Polity", className: "gs-tag-polity" },
  economy: { label: "Economy", className: "gs-tag-economy" },
  environment: { label: "Environment", className: "gs-tag-environment" },
  ir: { label: "IR", className: "gs-tag-ir" },
  science: { label: "S&T", className: "gs-tag-science" },
  ethics: { label: "Ethics", className: "gs-tag-ethics" },
  essay: { label: "Essay", className: "gs-tag-essay" },
  history: { label: "History", className: "gs-tag-history" },
  geography: { label: "Geography", className: "gs-tag-geography" },
  society: { label: "Society", className: "gs-tag-society" },
};

export const GS_PAPER_COLORS: Record<string, string> = {
  "GS-1": "gs-tag-history",
  "GS-2": "gs-tag-polity",
  "GS-3": "gs-tag-economy",
  "GS-4": "gs-tag-ethics",
  Essay: "gs-tag-essay",
};

/**
 * The strict canonical tag list for AI prompts.
 * Feed this into process-content to prevent hallucinated tag names.
 */
export const CANONICAL_SYLLABUS_TOPICS = [
  "Polity",
  "Economy",
  "Geography",
  "Environment",
  "History",
  "Science",
  "IR",
  "Society",
  "Ethics",
  "Essay",
] as const;
