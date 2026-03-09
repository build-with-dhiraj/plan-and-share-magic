import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SyllabusTagChip } from "@/components/issues/SyllabusTagChips";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Target, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { GsTag } from "@/components/issues/IssueCard";

const GS_TOPIC_DEFS = [
  { name: "Polity & Governance", slug: "polity" as GsTag, keywords: ["polity", "governance"] },
  { name: "Economy", slug: "economy" as GsTag, keywords: ["economy"] },
  { name: "Environment & Ecology", slug: "environment" as GsTag, keywords: ["environment", "ecology", "climate"] },
  { name: "International Relations", slug: "ir" as GsTag, keywords: ["international", "ir"] },
  { name: "Science & Technology", slug: "science" as GsTag, keywords: ["science", "tech"] },
  { name: "Ethics & Integrity", slug: "ethics" as GsTag, keywords: ["ethics"] },
  { name: "Indian History", slug: "history" as GsTag, keywords: ["history", "culture"] },
  { name: "Geography", slug: "geography" as GsTag, keywords: ["geography"] },
  { name: "Society", slug: "society" as GsTag, keywords: ["society", "social"] },
  { name: "Essay", slug: "essay" as GsTag, keywords: ["essay"] },
] as const;

type TopicDef = (typeof GS_TOPIC_DEFS)[number];

interface TopicArticle {
  id: string;
  title: string;
  summary: string | null;
  source_name: string | null;
  published_at: string | null;
}

const SyllabusPage = () => {
  const [selectedTopic, setSelectedTopic] = useState<TopicDef | null>(null);

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

  // Fetch articles for the selected topic
  const { data: topicArticles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["syllabus-articles", selectedTopic?.slug],
    queryFn: async () => {
      if (!selectedTopic) return [];
      // Use ilike + or to match any of the topic's keywords in syllabus_tags
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, summary, source_name, published_at")
        .eq("processed", true)
        .contains("syllabus_tags", [selectedTopic.slug])
        .order("published_at", { ascending: false })
        .limit(20);

      if (error || !data) return [];
      return data as TopicArticle[];
    },
    enabled: !!selectedTopic,
  });

  const topics = GS_TOPIC_DEFS.map((topic) => {
    const count = topic.keywords.reduce((sum, kw) => {
      return sum + Object.entries(tagCounts).reduce((s, [k, v]) => k.includes(kw) ? s + v : s, 0);
    }, 0);
    return { ...topic, issueCount: count };
  });

  const maxCount = Math.max(...topics.map((t) => t.issueCount), 1);

  return (
    <div className="container max-w-4xl py-4 sm:py-6 px-4 pb-24 lg:pb-6">
      <AnimatePresence mode="wait">
        {selectedTopic ? (
          <motion.div
            key="topic-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setSelectedTopic(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <SyllabusTagChip tag={selectedTopic.slug} />
                  <h1 className="text-lg font-bold text-foreground">{selectedTopic.name}</h1>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {topicArticles.length} article{topicArticles.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Practice this topic button */}
            <Link to={`/practice`}>
              <Button variant="outline" className="w-full mb-4 h-10 gap-2 text-sm">
                <Target className="h-4 w-4" /> Practice {selectedTopic.name} MCQs
              </Button>
            </Link>

            {/* Articles list */}
            {articlesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : topicArticles.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-muted-foreground">No articles found for this topic yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topicArticles.map((article) => (
                  <Link key={article.id} to={`/issue/${article.id}`}>
                    <motion.div
                      className="glass-card rounded-xl p-4 cursor-pointer group hover:shadow-md transition-shadow"
                      whileTap={{ scale: 0.98 }}
                    >
                      <h3 className="font-semibold text-foreground text-sm leading-snug mb-1 group-hover:text-accent transition-colors">
                        {article.title}
                      </h3>
                      {article.summary && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                          {article.summary}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          {article.source_name && <span>{article.source_name}</span>}
                          {article.published_at && (
                            <span>
                              {new Date(article.published_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="topic-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-1">Syllabus Topics</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mb-5">
              Browse current affairs mapped to UPSC GS topics
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {topics.map((topic) => (
                  <motion.div
                    key={topic.slug}
                    className="glass-card rounded-xl p-4 sm:p-5 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.97]"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => topic.issueCount > 0 && setSelectedTopic(topic)}
                    style={{ opacity: topic.issueCount === 0 ? 0.5 : 1 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <SyllabusTagChip tag={topic.slug} />
                      <span className="text-xs text-muted-foreground">{topic.issueCount} articles</span>
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
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SyllabusPage;
