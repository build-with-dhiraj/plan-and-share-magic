import { motion } from "framer-motion";
import { SyllabusTagChip } from "@/components/issues/SyllabusTagChips";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const GS_TOPIC_DEFS = [
  { name: "Polity & Governance", slug: "polity", keywords: ["polity", "governance"] },
  { name: "Economy", slug: "economy", keywords: ["economy"] },
  { name: "Environment & Ecology", slug: "environment", keywords: ["environment", "ecology", "climate"] },
  { name: "International Relations", slug: "ir", keywords: ["international", "ir"] },
  { name: "Science & Technology", slug: "science", keywords: ["science", "tech"] },
  { name: "Ethics & Integrity", slug: "ethics", keywords: ["ethics"] },
  { name: "Indian History", slug: "history", keywords: ["history", "culture"] },
  { name: "Geography", slug: "geography", keywords: ["geography"] },
  { name: "Society", slug: "society", keywords: ["society", "social"] },
  { name: "Essay", slug: "essay", keywords: ["essay"] },
] as const;

const SyllabusPage = () => {
  const { data: tagCounts = {}, isLoading } = useQuery({
    queryKey: ["syllabus-tag-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("syllabus_tags")
        .eq("processed", true);

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        for (const tag of row.syllabus_tags ?? []) {
          const t = tag.toLowerCase();
          counts[t] = (counts[t] || 0) + 1;
        }
      }
      return counts;
    },
  });

  const topics = GS_TOPIC_DEFS.map((topic) => {
    const count = topic.keywords.reduce((sum, kw) => {
      return sum + Object.entries(tagCounts).reduce((s, [k, v]) => k.includes(kw) ? s + v : s, 0);
    }, 0);
    return { ...topic, issueCount: count };
  });

  const maxCount = Math.max(...topics.map((t) => t.issueCount), 1);

  return (
    <div className="container max-w-4xl py-4 sm:py-6 px-4">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-1">Explore by Syllabus</h1>
      <p className="text-xs sm:text-sm text-muted-foreground mb-5">Browse current affairs mapped to UPSC GS papers</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
        >
          {topics.map((topic) => (
            <motion.div
              key={topic.slug}
              className="glass-card rounded-xl p-4 sm:p-5 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.97]"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between mb-3">
                <SyllabusTagChip tag={topic.slug as any} />
                <span className="text-xs text-muted-foreground">{topic.issueCount} issues</span>
              </div>
              <h3 className="font-semibold text-foreground text-xs sm:text-sm mb-2">{topic.name}</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Coverage</span>
                  <span>{topic.issueCount > 0 ? Math.round((topic.issueCount / maxCount) * 100) : 0}%</span>
                </div>
                <Progress value={topic.issueCount > 0 ? (topic.issueCount / maxCount) * 100 : 0} className="h-1.5" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default SyllabusPage;
