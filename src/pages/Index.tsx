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

const Index = () => {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["todays-brief"],
    queryFn: async () => {
      // Get today's date in UTC
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // First try today's processed articles
      let { data, error } = await supabase
        .from("articles")
        .select("id, title, summary, syllabus_tags, source_name, source_url, published_at")
        .eq("processed", true)
        .not("summary", "is", null)
        .gte("ingested_at", todayISO)
        .order("ingested_at", { ascending: false })
        .limit(20);

      // If no articles today, get the most recent processed ones
      if (!data || data.length === 0) {
        const fallback = await supabase
          .from("articles")
          .select("id, title, summary, syllabus_tags, source_name, source_url, published_at")
          .eq("processed", true)
          .order("ingested_at", { ascending: false })
          .limit(20);
        data = fallback.data;
      }

      return (data ?? []).map((a) => {
        const gsTags: GsTag[] = (a.syllabus_tags ?? [])
          .map((t: string) => normalizeTag(t))
          .filter(Boolean) as GsTag[];
        return {
          id: a.id,
          title: a.title,
          synopsis: a.summary || "",
          gsTags: gsTags.length > 0 ? gsTags : (["polity"] as GsTag[]),
          sourceCount: 1,
          confidence: 0.85,
          staticAnchor: undefined,
          isHero: false,
        };
      });
    },
  });

  // Mark first article as hero
  const displayArticles = articles.map((a, i) => ({ ...a, isHero: i === 0 }));

  return (
    <div className="container max-w-3xl py-4 sm:py-6 px-4">
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
      ) : displayArticles.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">No articles processed yet today.</p>
          <p className="text-xs mt-1">Content pipeline is running — check back soon.</p>
        </div>
      ) : (
        <>
          <motion.div className="space-y-3 sm:space-y-4" variants={container} initial="hidden" animate="show">
            {displayArticles.map((issue) => (
              <motion.div key={issue.id} variants={item}>
                <IssueCard {...issue} />
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="mt-8 flex items-center justify-center gap-2 text-muted-foreground py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <CheckCircle className="h-5 w-5 text-gs-economy" />
            <span className="text-sm font-medium">You're all caught up</span>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Index;
