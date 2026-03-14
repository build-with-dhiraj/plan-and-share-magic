import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SyllabusTagChip } from "@/components/issues/SyllabusTagChips";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Target, ChevronRight, ChevronDown, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import type { GsTag } from "@/components/issues/IssueCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { fetchPYQTopicCounts } from "@/hooks/usePYQBank";

// GS Paper → Topics mapping (UPSC structure)
const GS_PAPERS = [
  {
    paper: "GS-1",
    label: "GS Paper I",
    subtitle: "History, Society & Geography",
    colorClass: "gs-tag-history",
    topics: [
      { name: "Indian History", slug: "history" as GsTag, dbTag: "History", keywords: ["history", "culture"] },
      { name: "Society", slug: "society" as GsTag, dbTag: "Society", keywords: ["society", "social"] },
      { name: "Geography", slug: "geography" as GsTag, dbTag: "Geography", keywords: ["geography"] },
    ],
  },
  {
    paper: "GS-2",
    label: "GS Paper II",
    subtitle: "Polity, Governance & IR",
    colorClass: "gs-tag-polity",
    topics: [
      { name: "Polity & Governance", slug: "polity" as GsTag, dbTag: "Polity", keywords: ["polity", "governance"] },
      { name: "International Relations", slug: "ir" as GsTag, dbTag: "IR", keywords: ["international", "ir"] },
    ],
  },
  {
    paper: "GS-3",
    label: "GS Paper III",
    subtitle: "Economy, S&T & Environment",
    colorClass: "gs-tag-economy",
    topics: [
      { name: "Economy", slug: "economy" as GsTag, dbTag: "Economy", keywords: ["economy"] },
      { name: "Science & Technology", slug: "science" as GsTag, dbTag: "Science", keywords: ["science", "tech"] },
      { name: "Environment & Ecology", slug: "environment" as GsTag, dbTag: "Environment", keywords: ["environment", "ecology", "climate"] },
    ],
  },
  {
    paper: "GS-4",
    label: "GS Paper IV",
    subtitle: "Ethics, Integrity & Aptitude",
    colorClass: "gs-tag-ethics",
    topics: [
      { name: "Ethics & Integrity", slug: "ethics" as GsTag, dbTag: "Ethics", keywords: ["ethics"] },
    ],
  },
  {
    paper: "Essay",
    label: "Essay",
    subtitle: "Essay Paper",
    colorClass: "gs-tag-essay",
    topics: [
      { name: "Essay", slug: "essay" as GsTag, dbTag: "Essay", keywords: ["essay"] },
    ],
  },
] as const;

type TopicDef = (typeof GS_PAPERS)[number]["topics"][number];

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
        .eq("processed", true)
        .not("layer", "eq", "C");

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

  const { data: pyqCounts = {} } = useQuery({
    queryKey: ["syllabus-pyq-counts"],
    queryFn: fetchPYQTopicCounts,
  });

  const { data: topicArticles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["syllabus-articles", selectedTopic?.slug],
    queryFn: async () => {
      if (!selectedTopic) return [];
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, summary, source_name, published_at")
        .eq("processed", true)
        .not("layer", "eq", "C")
        .contains("syllabus_tags", [selectedTopic.dbTag])
        .order("published_at", { ascending: false })
        .limit(20);
      if (error || !data) return [];
      return data as TopicArticle[];
    },
    enabled: !!selectedTopic,
  });

  // Helper to get count for a topic
  const getTopicCount = (topic: TopicDef) =>
    topic.keywords.reduce((sum, kw) =>
      sum + Object.entries(tagCounts).reduce((s, [k, v]) => k.includes(kw) ? s + v : s, 0), 0);

  // Helper to get PYQ count for a topic
  const getPYQCount = (topic: TopicDef) =>
    topic.keywords.reduce((sum, kw) =>
      sum + Object.entries(pyqCounts).reduce((s, [k, v]) => k.toLowerCase().includes(kw) ? s + v : s, 0), 0);

  // Get total count per GS paper
  const getPaperCount = (topics: readonly TopicDef[]) =>
    topics.reduce((sum, t) => sum + getTopicCount(t), 0);

  // Get total PYQ count per GS paper
  const getPaperPYQCount = (topics: readonly TopicDef[]) =>
    topics.reduce((sum, t) => sum + getPYQCount(t), 0);

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
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedTopic(null)}>
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

            <Link to="/practice">
              <Button variant="outline" className="w-full mb-4 h-10 gap-2 text-sm">
                <Target className="h-4 w-4" /> Practice {selectedTopic.name} MCQs
              </Button>
            </Link>

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
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{article.summary}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          {article.source_name && <span>{article.source_name}</span>}
                          {article.published_at && (
                            <span>{new Date(article.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
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
            key="gs-papers"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-1">Syllabus Topics</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mb-5">
              Browse current affairs mapped to UPSC GS papers & topics
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={["GS-1", "GS-2", "GS-3", "GS-4"]} className="space-y-3">
                {GS_PAPERS.map((gs) => {
                  const paperCount = getPaperCount(gs.topics);
                  const paperPYQCount = getPaperPYQCount(gs.topics);
                  return (
                    <AccordionItem key={gs.paper} value={gs.paper} className="border-none">
                      <AccordionTrigger className="glass-card rounded-xl px-4 py-3 hover:no-underline hover:shadow-md transition-shadow [&[data-state=open]]:rounded-b-none">
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <Badge className={`${gs.colorClass} border text-xs font-bold px-2.5 py-1`}>
                            {gs.paper}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{gs.label}</p>
                            <p className="text-xs text-muted-foreground">{gs.subtitle}</p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {paperCount} articles{paperPYQCount > 0 && ` · ${paperPYQCount} PYQs`}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="glass-card rounded-b-xl border-t border-border px-3 pt-3 pb-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {gs.topics.map((topic) => {
                            const count = getTopicCount(topic);
                            const pyqCount = getPYQCount(topic);
                            return (
                              <motion.div
                                key={topic.slug}
                                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors active:scale-[0.98]"
                                whileTap={{ scale: 0.98 }}
                                onClick={() => count > 0 && setSelectedTopic(topic)}
                                style={{ opacity: count === 0 ? 0.5 : 1 }}
                              >
                                <SyllabusTagChip tag={topic.slug} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{topic.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {count} articles
                                    {pyqCount > 0 && (
                                      <span className="inline-flex items-center gap-0.5 ml-1.5">
                                        · <GraduationCap className="h-3 w-3 text-green-500 inline" /> {pyqCount} PYQs
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              </motion.div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SyllabusPage;
