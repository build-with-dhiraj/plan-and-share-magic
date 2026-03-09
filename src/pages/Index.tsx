import { motion } from "framer-motion";
import { IssueCard } from "@/components/issues/IssueCard";
import { CheckCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GsTag } from "@/components/issues/IssueCard";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function normalizeTag(tag: string): GsTag | null {
  const t = tag.toLowerCase();
  if (t.includes("polity") || t.includes("governance")) return "polity";
  if (t.includes("economy")) return "economy";
  if (t.includes("environment") || t.includes("ecology") || t.includes("climate")) return "environment";
  if (t.includes("international") || t === "ir") return "ir";
  if (t.includes("science") || t.includes("tech")) return "science";
  if (t.includes("ethics")) return "ethics";
  if (t.includes("history") || t.includes("culture")) return "history";
  if (t.includes("geography")) return "geography";
  if (t.includes("society") || t.includes("social")) return "society";
  if (t.includes("essay")) return "essay";
  return null;
}

type TieredArticle = {
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
};

const TIER_ORDER = ["deep_analysis", "important_facts", "rapid_fire"] as const;
const TIER_LABELS: Record<string, string> = {
  deep_analysis: "In Depth",
  important_facts: "Key Facts",
  rapid_fire: "Quick Bites",
};

const Index = () => {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["todays-brief"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // First try today's processed articles with relevance filter
      let { data, error } = await supabase
        .from("articles")
        .select("id, title, summary, syllabus_tags, source_name, source_url, published_at, upsc_relevance, depth_tier, gs_papers")
        .eq("processed", true)
        .not("summary", "is", null)
        .gte("ingested_at", todayISO)
        .order("ingested_at", { ascending: false })
        .limit(30);

      // If no articles today, get the most recent processed ones
      if (!data || data.length === 0) {
        const fallback = await supabase
          .from("articles")
          .select("id, title, summary, syllabus_tags, source_name, source_url, published_at, upsc_relevance, depth_tier, gs_papers")
          .eq("processed", true)
          .not("summary", "is", null)
          .order("ingested_at", { ascending: false })
          .limit(30);
        data = fallback.data;
      }

      // Filter: only show articles with upsc_relevance >= 0.4 (or all if column is null for backward compat)
      const filtered = (data ?? []).filter((a: any) => {
        if (a.upsc_relevance === null || a.upsc_relevance === undefined) return true;
        return Number(a.upsc_relevance) >= 0.4;
      });

      // Cap at 15 articles/day
      const capped = filtered.slice(0, 15);

      return capped.map((a: any) => {
        const gsTags: GsTag[] = (a.syllabus_tags ?? [])
          .map((t: string) => normalizeTag(t))
          .filter(Boolean) as GsTag[];
        return {
          id: a.id,
          title: a.title,
          synopsis: a.summary || "",
          gsTags: gsTags.length > 0 ? gsTags : (["polity"] as GsTag[]),
          gsPapers: a.gs_papers ?? [],
          sourceCount: 1,
          confidence: null,
          staticAnchor: undefined,
          isHero: false,
          depthTier: a.depth_tier || null,
        } as TieredArticle;
      });
    },
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Group articles by tier
  const grouped = TIER_ORDER.reduce((acc, tier) => {
    acc[tier] = articles.filter((a) => a.depthTier === tier);
    return acc;
  }, {} as Record<string, TieredArticle[]>);

  // Articles with no tier (old articles) go into a fallback
  const untied = articles.filter((a) => !a.depthTier);

  // Mark first article in each group as hero
  const markHero = (list: TieredArticle[]) =>
    list.map((a, i) => ({ ...a, isHero: i === 0 }));

  const hasTieredContent = TIER_ORDER.some((t) => grouped[t].length > 0);

  return (
    <div className="container max-w-3xl py-4 sm:py-6 px-4 pb-24 lg:pb-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Today's Brief</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">No articles processed yet today.</p>
          <p className="text-xs mt-1">Content pipeline is running — check back soon.</p>
        </div>
      ) : hasTieredContent ? (
        <>
          {TIER_ORDER.map((tier) => {
            const tierArticles = markHero(grouped[tier]);
            if (tierArticles.length === 0) return null;
            return (
              <div key={tier} className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {TIER_LABELS[tier]}
                </h2>
                <motion.div className="space-y-3 sm:space-y-4" variants={container} initial="hidden" animate="show">
                  {tierArticles.map((issue) => (
                    <motion.div key={issue.id} variants={item}>
                      <IssueCard {...issue} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            );
          })}
          {untied.length > 0 && (
            <div className="mb-6">
              <motion.div className="space-y-3 sm:space-y-4" variants={container} initial="hidden" animate="show">
                {markHero(untied).map((issue) => (
                  <motion.div key={issue.id} variants={item}>
                    <IssueCard {...issue} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </>
      ) : (
        <motion.div className="space-y-3 sm:space-y-4" variants={container} initial="hidden" animate="show">
          {markHero(untied.length > 0 ? untied : articles).map((issue) => (
            <motion.div key={issue.id} variants={item}>
              <IssueCard {...issue} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {articles.length > 0 && (
        <motion.div
          className="mt-8 flex items-center justify-center gap-2 text-muted-foreground py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <CheckCircle className="h-5 w-5 text-gs-economy" />
          <span className="text-sm font-medium">You're all caught up</span>
        </motion.div>
      )}
    </div>
  );
};

export default Index;
