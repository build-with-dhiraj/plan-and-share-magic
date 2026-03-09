import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, Loader2, ArrowLeft, ChevronDown, ChevronUp, BookOpen, PenTool, HelpCircle, Lightbulb, MessageSquare, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function tagColorClass(tag: string): string {
  const t = tag.toLowerCase();
  if (t.includes("polity") || t.includes("governance")) return "gs-tag-polity";
  if (t.includes("economy")) return "gs-tag-economy";
  if (t.includes("environment") || t.includes("climate")) return "gs-tag-environment";
  if (t.includes("international") || t === "ir") return "gs-tag-ir";
  if (t.includes("science") || t.includes("tech")) return "gs-tag-science";
  if (t.includes("ethics")) return "gs-tag-ethics";
  if (t.includes("history") || t.includes("culture")) return "gs-tag-history";
  if (t.includes("geography")) return "gs-tag-geography";
  if (t.includes("society") || t.includes("social")) return "gs-tag-society";
  return "";
}

function gsPaperColorClass(paper: string): string {
  switch (paper) {
    case "GS-1": return "gs-tag-history";
    case "GS-2": return "gs-tag-polity";
    case "GS-3": return "gs-tag-economy";
    case "GS-4": return "gs-tag-ethics";
    default: return "";
  }
}

const IssuePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: facts = [] } = useQuery({
    queryKey: ["article-facts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("facts")
        .select("*")
        .eq("article_id", id!)
        .order("confidence", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: mcqs = [] } = useQuery({
    queryKey: ["article-mcqs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mcq_bank")
        .select("id, question, options, correct_index, explanation, topic, difficulty")
        .eq("article_id", id!)
        .limit(5);
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isJunk = article && /^(404|403|500)\b|not\s*found|access\s*denied|error\s*page|sorry.*inconvenience|cloudflare|captcha/i.test(article.title);

  if (!article || isJunk) {
    return (
      <div className="container max-w-4xl py-6 px-4 text-center text-muted-foreground">
        <p>Article not found.</p>
      </div>
    );
  }

  const tags = article.syllabus_tags ?? [];
  const gsPapers: string[] = article.gs_papers ?? [];
  const prelimsKeywords: string[] = article.prelims_keywords ?? [];
  const mainsAngle: string | null = article.mains_angle ?? null;
  const mainsQuestion: string | null = article.mains_question ?? null;
  const detailedAnalysis = (article.detailed_analysis as { heading: string; content: string }[] | null) ?? null;
  const conclusion: string | null = article.conclusion ?? null;
  const faqs = (article.faqs as { question: string; answer: string }[] | null) ?? null;

  const timeSince = article.published_at
    ? formatTimeSince(new Date(article.published_at))
    : article.ingested_at
    ? formatTimeSince(new Date(article.ingested_at))
    : "";

  return (
    <div className="container max-w-4xl py-4 sm:py-6 px-4 pb-24 lg:pb-6">
      {/* Back button */}
      <Button variant="ghost" size="icon" className="h-8 w-8 mb-3" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* Header: GS Papers + Syllabus Tags + Source + Time */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          {gsPapers.map((paper: string) => (
            <Badge key={paper} className={`${gsPaperColorClass(paper)} border text-xs font-semibold`}>{paper}</Badge>
          ))}
          {tags.map((tag: string) => (
            <Badge key={tag} className={`${tagColorClass(tag)} border text-xs`}>{tag}</Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs sm:text-sm mb-2">
          <span>Source: {article.source_name}</span>
          {timeSince && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {timeSince}</span>}
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight">
          {article.title}
        </h1>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-accent/30 mb-5" />

      {/* Prelims & Mains keywords strip */}
      {(prelimsKeywords.length > 0 || tags.length > 0) && (
        <div className="glass-card rounded-xl p-4 mb-4 space-y-2">
          {prelimsKeywords.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-accent uppercase tracking-wide">For Prelims: </span>
              <span className="text-sm text-foreground">{prelimsKeywords.join(", ")}</span>
            </div>
          )}
          {tags.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-accent uppercase tracking-wide">For Mains: </span>
              <span className="text-sm text-foreground">{tags.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      {/* Why in News */}
      {article.summary && (
        <Section icon={BookOpen} title="Why in News?">
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">{article.summary}</div>
        </Section>
      )}

      {/* Key Analysis (detailed_analysis sections) */}
      {detailedAnalysis && detailedAnalysis.length > 0 && (
        <Section icon={FileText} title="Key Analysis">
          <div className="space-y-4">
            {detailedAnalysis.map((section, i) => (
              <div key={i}>
                <h4 className="text-sm font-semibold text-foreground mb-1.5">{section.heading}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Conclusion */}
      {conclusion && (
        <Section icon={Lightbulb} title="Conclusion">
          <p className="text-sm text-foreground leading-relaxed">{conclusion}</p>
        </Section>
      )}

      {/* Why This Matters for Mains */}
      {mainsAngle && (
        <Section icon={PenTool} title="Why This Matters for Mains">
          <p className="text-sm text-foreground leading-relaxed">{mainsAngle}</p>
        </Section>
      )}

      {/* Practice Mains Question */}
      {mainsQuestion && (
        <Section icon={PenTool} title="Practice Mains Question">
          <div className="glass-card rounded-lg p-4 border-l-4 border-accent bg-accent/5">
            <p className="text-sm text-foreground italic leading-relaxed">&ldquo;{mainsQuestion}&rdquo;</p>
          </div>
        </Section>
      )}

      {/* Test Yourself — MCQs */}
      {mcqs.length > 0 && (
        <Section icon={HelpCircle} title="Test Yourself">
          <div className="space-y-3">
            {mcqs.map((m: any, i: number) => (
              <MCQCard key={m.id} mcq={m} index={i} />
            ))}
          </div>
        </Section>
      )}

      {/* Quick Revision (FAQs) */}
      {faqs && faqs.length > 0 && (
        <Section icon={MessageSquare} title="Quick Revision (FAQs)">
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="glass-card rounded-lg p-3">
                <p className="text-sm font-medium text-foreground mb-1">Q: {faq.question}</p>
                <p className="text-sm text-muted-foreground">A: {faq.answer}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Key Facts for Prelims */}
      {facts.length > 0 && (
        <Section icon={Lightbulb} title="Key Facts for Prelims">
          <div className="space-y-2">
            {facts.map((f: any) => (
              <div key={f.id} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <p className="text-sm text-foreground">{f.fact_text}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Source */}
      <Section icon={ExternalLink} title="Source">
        <a
          href={article.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Read original article
        </a>
      </Section>
    </div>
  );
};

// ── Section wrapper ─────────────────────────────────────────────
function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </div>
  );
}

// ── Interactive MCQ Card ────────────────────────────────────────
function MCQCard({ mcq, index }: { mcq: any; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  return (
    <div className="glass-card rounded-xl p-4">
      <p className="text-sm font-medium text-foreground mb-2">Q{index + 1}: {mcq.question}</p>
      <div className="space-y-1.5 mb-3">
        {mcq.options.map((opt: string, oi: number) => {
          let style = "border-border text-muted-foreground cursor-pointer hover:bg-muted/50";
          if (revealed) {
            if (oi === mcq.correct_index) {
              style = "border-green-500/40 bg-green-500/10 text-foreground";
            } else if (oi === selected) {
              style = "border-destructive/40 bg-destructive/10 text-foreground";
            } else {
              style = "border-border text-muted-foreground opacity-60";
            }
          }
          return (
            <button
              key={oi}
              className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-colors ${style}`}
              onClick={() => !revealed && setSelected(oi)}
              disabled={revealed}
            >
              {String.fromCharCode(65 + oi)}. {opt}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-xs text-muted-foreground">
              <strong>{selected === mcq.correct_index ? "Correct!" : "Incorrect."}</strong> {mcq.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTimeSince(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

export default IssuePage;
