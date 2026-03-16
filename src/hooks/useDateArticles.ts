import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, parseISO, isToday as isTodayFn } from "date-fns";
import { normalizeAndDedup, dedupeTagsAgainstPapers, type GsTag } from "@/lib/tags";

export type TieredArticle = {
  id: string;
  title: string;
  synopsis: string;
  gsTags: GsTag[];
  gsPapers: string[];
  sourceCount: number;
  confidence: number | null;
  staticAnchor?: string;
  isHero: boolean;
  depthTier: string | null;
  sourceName?: string;
  layer?: string;
};

export const TIER_ORDER = ["deep_analysis", "important_facts", "rapid_fire"] as const;

export const TIER_LABELS: Record<string, string> = {
  deep_analysis: "In Depth",
  important_facts: "Key Facts",
  rapid_fire: "Quick Bites",
};

const SELECT_FIELDS =
  "id, title, summary, syllabus_tags, source_name, source_url, published_at, upsc_relevance, depth_tier, gs_papers, layer";

function mapArticle(a: any): TieredArticle {
  const gsPapers: string[] = a.gs_papers ?? [];
  // Normalize + deduplicate: collapses "S&T"+"Science"+"ISRO" → ["science"]
  const allTags = normalizeAndDedup(a.syllabus_tags ?? []);
  // Cross-dedup against GS paper badges to reduce visual clutter
  const gsTags = dedupeTagsAgainstPapers(allTags, gsPapers);
  return {
    id: a.id,
    title: a.title,
    synopsis: a.summary || "",
    gsTags: gsTags.length > 0 ? gsTags : (["polity"] as GsTag[]),
    gsPapers,
    sourceCount: 1,
    confidence: null,
    staticAnchor: undefined,
    isHero: false,
    depthTier: a.depth_tier || null,
    sourceName: a.source_name,
    layer: a.layer,
  };
}

function filterByRelevance(data: any[]): any[] {
  return data.filter((a) => {
    if (a.upsc_relevance === null || a.upsc_relevance === undefined) return true;
    return Number(a.upsc_relevance) >= 0.1;
  });
}

/**
 * Enforce source diversity: no single source should dominate the feed.
 * - Max 5 articles per source
 * - Interleave sources so the feed isn't a wall of one newspaper
 */
function enforceSourceDiversity(articles: any[], maxPerSource = 5): any[] {
  const bySource: Record<string, any[]> = {};
  for (const a of articles) {
    const src = a.source_name || "unknown";
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(a);
  }

  // Round-robin interleave: take 1 from each source in rotation
  const result: any[] = [];
  const sourceKeys = Object.keys(bySource);
  const pointers: Record<string, number> = {};
  sourceKeys.forEach((k) => (pointers[k] = 0));

  let added = true;
  while (added) {
    added = false;
    for (const key of sourceKeys) {
      const idx = pointers[key];
      if (idx < bySource[key].length && idx < maxPerSource) {
        result.push(bySource[key][idx]);
        pointers[key] = idx + 1;
        added = true;
      }
    }
  }

  return result;
}

async function fetchArticlesForToday(): Promise<TieredArticle[]> {
  // Rolling 36-hour window (covers late-night articles from yesterday)
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 36);
  const cutoffISO = cutoff.toISOString();

  // Fetch articles with published_at in window OR ingested recently with null published_at
  let { data } = await supabase
    .from("articles")
    .select(SELECT_FIELDS)
    .eq("processed", true)
    .not("summary", "is", null)
    .or(`published_at.gte.${cutoffISO},and(published_at.is.null,ingested_at.gte.${cutoffISO})`)
    .order("ingested_at", { ascending: false })
    .limit(30);

  // Fallback: get the most recent processed articles regardless of date
  if (!data || data.length === 0) {
    const fallback = await supabase
      .from("articles")
      .select(SELECT_FIELDS)
      .eq("processed", true)
      .not("summary", "is", null)
      .order("ingested_at", { ascending: false })
      .limit(30);
    data = fallback.data;
  }

  const filtered = filterByRelevance(data ?? []);
  const diverse = enforceSourceDiversity(filtered);
  return diverse.slice(0, 15).map(mapArticle);
}

async function fetchArticlesForDate(dateString: string): Promise<TieredArticle[]> {
  // Day boundaries in IST (UTC+05:30)
  const dayStart = `${dateString}T00:00:00+05:30`;
  const nextDay = format(addDays(parseISO(dateString), 1), "yyyy-MM-dd");
  const dayEnd = `${nextDay}T00:00:00+05:30`;

  // First try: processed articles with summaries (best quality)
  let { data } = await supabase
    .from("articles")
    .select(SELECT_FIELDS)
    .eq("processed", true)
    .not("summary", "is", null)
    .or(`and(published_at.gte.${dayStart},published_at.lt.${dayEnd}),and(published_at.is.null,ingested_at.gte.${dayStart},ingested_at.lt.${dayEnd})`)
    .order("ingested_at", { ascending: false })
    .limit(30);

  // Fallback: if no processed articles, show ALL articles for this date (even unprocessed)
  if (!data || data.length === 0) {
    const fallback = await supabase
      .from("articles")
      .select(SELECT_FIELDS)
      .or(`and(published_at.gte.${dayStart},published_at.lt.${dayEnd}),and(published_at.is.null,ingested_at.gte.${dayStart},ingested_at.lt.${dayEnd})`)
      .order("ingested_at", { ascending: false })
      .limit(30);
    data = fallback.data;
  }

  const filtered = filterByRelevance(data ?? []);
  const diverse = enforceSourceDiversity(filtered);
  return diverse.slice(0, 15).map(mapArticle);
}

/**
 * Hook to fetch articles for a specific date or "today".
 * @param dateString - "YYYY-MM-DD" or null (meaning today)
 */
export function useDateArticles(dateString: string | null) {
  const isToday = !dateString || isTodayFn(parseISO(dateString));
  const queryKey = isToday ? "today" : dateString;

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["todays-brief", queryKey],
    queryFn: () => (isToday ? fetchArticlesForToday() : fetchArticlesForDate(dateString!)),
    refetchInterval: isToday ? 5 * 60 * 1000 : false, // only poll for today
    refetchOnWindowFocus: isToday,
    placeholderData: keepPreviousData,
  });

  return { articles, isLoading, isToday };
}
