import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock, ExternalLink, Loader2, ArrowLeft, BookOpen, PenTool,
  HelpCircle, Lightbulb, MessageSquare, FileText,
  Bookmark, BookmarkCheck, Target, ThumbsUp, ThumbsDown,
  ShieldCheck, CheckCircle2, GraduationCap, Bot, Send, ChevronDown, LogIn, Square,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { fetchRelatedPYQs, type PYQQuestion } from "@/hooks/usePYQBank";
import { useMentorChat, type ChatMessage } from "@/hooks/useMentorChat";

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

// ── Auto-hyperlink UPSC terms (Drishti IAS style) ───────────────
function HyperlinkedText({ text, terms }: { text: string; terms: { term: string; slug: string }[] }) {
  if (!terms.length) return <>{text}</>;

  // Build regex from all terms (longest first to avoid partial matches)
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);
  const pattern = sorted.map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");

  const termMap = new Map(sorted.map((t) => [t.term.toLowerCase(), t]));

  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => {
        const match = termMap.get(part.toLowerCase());
        if (match) {
          return (
            <Link
              key={i}
              to={`/search?q=${encodeURIComponent(match.term)}`}
              className="text-accent underline underline-offset-2 decoration-accent/40 hover:decoration-accent transition-colors"
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

const IssuePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Related PYQs
  const { data: relatedPYQs = [] } = useQuery({
    queryKey: ["related-pyqs", id],
    queryFn: () => fetchRelatedPYQs(id!),
    enabled: !!id,
  });

  // Bookmark state
  const { data: isBookmarked = false } = useQuery({
    queryKey: ["bookmark-status", user?.id, id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_id", id!)
        .eq("item_type", "article")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id,
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (!user) { toast.error("Sign in to bookmark"); return; }
      if (isBookmarked) {
        await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("item_id", id!).eq("item_type", "article");
      } else {
        await supabase.from("bookmarks").insert({ user_id: user.id, item_id: id!, item_type: "article" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark-status", user?.id, id] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success(isBookmarked ? "Bookmark removed" : "Bookmarked!");
    },
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
  const hyperlinkedTerms: { term: string; slug: string }[] = [];

  const timeSince = article.published_at
    ? formatTimeSince(new Date(article.published_at))
    : article.ingested_at
    ? formatTimeSince(new Date(article.ingested_at))
    : "";

  const primaryTopic = tags[0] ?? "Current Affairs";

  return (
    <div className="container max-w-4xl py-4 sm:py-6 px-4 pb-28 lg:pb-6">
      {/* Back + Actions bar */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${isBookmarked ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => toggleBookmark.mutate()}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Header: GS Papers + Syllabus Tags + Source + Time */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          {gsPapers.map((paper: string) => (
            <Badge key={paper} className={`${gsPaperColorClass(paper)} border text-xs font-semibold`}>{paper}</Badge>
          ))}
          {tags.map((tag: string) => (
            <Badge key={tag} className={`${tagColorClass(tag)} border text-xs`}>{tag}</Badge>
          ))}
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight mb-2">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs sm:text-sm">
          <span>Source: {article.source_name}</span>
          {timeSince && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {timeSince}</span>}
        </div>
      </div>

      {/* Prelims & Mains strip — prominent, right after title */}
      {(prelimsKeywords.length > 0 || tags.length > 0) && (
        <div className="rounded-xl p-4 mb-5 space-y-2 border-l-4 border-accent bg-accent/5">
          {prelimsKeywords.length > 0 && (
            <div>
              <span className="text-xs font-bold text-accent uppercase tracking-wide">For Prelims: </span>
              <span className="text-sm font-medium text-foreground">{prelimsKeywords.join(", ")}</span>
            </div>
          )}
          {(mainsAngle || tags.length > 0) && (
            <div>
              <span className="text-xs font-bold text-accent uppercase tracking-wide">For Mains: </span>
              <span className="text-sm font-medium text-foreground">{tags.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="border-t-2 border-accent/30 mb-5" />

      {/* Why in News */}
      {article.summary && (
        <Section icon={BookOpen} title="Why in News?">
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            <HyperlinkedText text={article.summary} terms={hyperlinkedTerms} />
          </div>
        </Section>
      )}

      {/* Key Analysis */}
      {detailedAnalysis && detailedAnalysis.length > 0 && (
        <Section icon={FileText} title="Key Analysis">
          <div className="space-y-4">
            {detailedAnalysis.map((section, i) => (
              <div key={i}>
                <h4 className="text-sm font-semibold text-foreground mb-1.5">{section.heading}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  <HyperlinkedText text={section.content} terms={hyperlinkedTerms} />
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Conclusion */}
      {conclusion && (
        <Section icon={Lightbulb} title="Conclusion">
          <p className="text-sm text-foreground leading-relaxed">
            <HyperlinkedText text={conclusion} terms={hyperlinkedTerms} />
          </p>
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

          {/* Practice more CTA */}
          <div className="mt-4">
            <Link to="/practice">
              <Button variant="outline" className="w-full h-10 gap-2 text-sm">
                <Target className="h-4 w-4" /> Practice more {primaryTopic} MCQs
              </Button>
            </Link>
          </div>
        </Section>
      )}

      {/* Asked Before in UPSC — Related PYQs */}
      {relatedPYQs.length > 0 && (
        <Section icon={GraduationCap} title="Asked Before in UPSC">
          {relatedPYQs.length >= 2 && (
            <div className="rounded-lg p-3 mb-3 bg-accent/10 border border-accent/20">
              <p className="text-sm font-medium text-accent">
                This topic has been asked {relatedPYQs.length} times in UPSC
                ({[...new Set(relatedPYQs.map(q => q.year))].sort().join(", ")})
              </p>
            </div>
          )}

          {/* Prelims PYQs */}
          {relatedPYQs.filter(q => q.exam_stage === "prelims").length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Prelims PYQs</p>
              <div className="space-y-2">
                {relatedPYQs.filter(q => q.exam_stage === "prelims").map(pyq => (
                  <PYQCard key={pyq.id} pyq={pyq} />
                ))}
              </div>
            </div>
          )}

          {/* Mains PYQs */}
          {relatedPYQs.filter(q => q.exam_stage === "mains").length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mains PYQs</p>
              <div className="space-y-2">
                {relatedPYQs.filter(q => q.exam_stage === "mains").map(pyq => (
                  <PYQCard key={pyq.id} pyq={pyq} />
                ))}
              </div>
            </div>
          )}

          <Link to="/practice?tab=pyq" className="block mt-3">
            <Button variant="outline" className="w-full h-10 gap-2 text-sm">
              <GraduationCap className="h-4 w-4" /> Practice all PYQs on this topic
            </Button>
          </Link>
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

      {/* Feedback */}
      <ArticleFeedback articleId={id!} />

      {/* Inline AI Mentor Chat */}
      <InlineMentorChat
        articleTitle={article.title}
        articleSummary={article.summary || ""}
        prelimsKeywords={prelimsKeywords}
        tags={tags}
      />
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

// ── Article Feedback ────────────────────────────────────────────
function ArticleFeedback({ articleId }: { articleId: string }) {
  const [submitted, setSubmitted] = useState<"up" | "down" | null>(null);

  const handleFeedback = async (vote: "up" | "down") => {
    setSubmitted(vote);
    // Fire-and-forget — store in article_feedback table (best-effort)
    try {
      await supabase.from("article_feedback").insert({
        article_id: articleId,
        vote,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Silent fail — feedback is non-critical
    }
  };

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feedback</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        {submitted ? (
          <p className="text-sm text-muted-foreground">Thanks for your feedback! 🙏</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">Was this article helpful for your UPSC prep?</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleFeedback("up")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 transition-colors"
              >
                <ThumbsUp className="h-4 w-4" /> Helpful
              </button>
              <button
                onClick={() => handleFeedback("down")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                <ThumbsDown className="h-4 w-4" /> Not helpful
              </button>
            </div>
          </>
        )}
      </div>
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

// ── PYQ Card — displays an official UPSC question ──────────────
function PYQCard({ pyq }: { pyq: PYQQuestion }) {
  const [selected, setSelected] = useState<string | null>(null);
  const revealed = selected !== null;
  const isPrelims = pyq.exam_stage === "prelims" && pyq.question_type === "mcq";
  const paperLabel = pyq.paper_code.toUpperCase().replace("GS", "GS-");

  return (
    <div className="glass-card rounded-xl p-4 border-l-4 border-green-500/40">
      {/* Badges row */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px] gap-1">
          <ShieldCheck className="h-3 w-3" /> Official PYQ
        </Badge>
        {pyq.gs_papers.map((gs: string) => (
          <Badge key={gs} className={`${gsPaperColorClass(gs)} border text-[10px]`}>{gs}</Badge>
        ))}
        <Badge variant="outline" className="text-[10px]">{pyq.year}</Badge>
        {pyq.official_key?.is_official && (
          <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px] gap-1">
            <CheckCircle2 className="h-3 w-3" /> Official Key
          </Badge>
        )}
      </div>

      {/* Question text */}
      <p className="text-sm font-medium text-foreground mb-2">
        {pyq.question_number ? `Q${pyq.question_number}: ` : ""}{pyq.question_text}
      </p>

      {/* Mains metadata */}
      {pyq.exam_stage === "mains" && (pyq.marks || pyq.word_limit) && (
        <p className="text-xs text-muted-foreground mb-2">
          {pyq.marks && `${pyq.marks} marks`}
          {pyq.marks && pyq.word_limit && " · "}
          {pyq.word_limit && `${pyq.word_limit} words`}
        </p>
      )}

      {/* Prelims options */}
      {isPrelims && pyq.options && pyq.options.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {pyq.options.map((opt) => {
            let style = "border-border text-muted-foreground cursor-pointer hover:bg-muted/50";
            if (revealed && pyq.official_key) {
              if (opt.option_label === pyq.official_key.answer_label) {
                style = "border-green-500/40 bg-green-500/10 text-foreground";
              } else if (opt.option_label === selected) {
                style = "border-destructive/40 bg-destructive/10 text-foreground";
              } else {
                style = "border-border text-muted-foreground opacity-60";
              }
            } else if (revealed) {
              if (opt.option_label === selected) {
                style = "border-accent/40 bg-accent/10 text-foreground";
              }
            }
            return (
              <button
                key={opt.option_label}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-colors ${style}`}
                onClick={() => !revealed && setSelected(opt.option_label)}
                disabled={revealed}
              >
                ({opt.option_label.toLowerCase()}) {opt.option_text}
              </button>
            );
          })}
        </div>
      )}

      {/* Answer reveal */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {pyq.official_key ? (
              <p className="text-xs text-muted-foreground">
                <strong className={selected === pyq.official_key.answer_label ? "text-green-600" : "text-destructive"}>
                  {selected === pyq.official_key.answer_label ? "Correct!" : "Incorrect."}
                </strong>{" "}
                Official answer: ({pyq.official_key.answer_label.toLowerCase()})
                {pyq.official_key.is_official ? " [Official Final Key]" : " [Coaching Consensus]"}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No official answer key available for this question.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mains — no interactive options, just a label */}
      {pyq.exam_stage === "mains" && (
        <p className="text-xs text-muted-foreground italic mt-1">
          UPSC does not publish Mains answer keys
        </p>
      )}
    </div>
  );
}

// ── Inline AI Mentor Chat ──────────────────────────────────────
function InlineMentorChat({
  articleTitle,
  articleSummary,
  prelimsKeywords,
  tags,
}: {
  articleTitle: string;
  articleSummary: string;
  prelimsKeywords: string[];
  tags: string[];
}) {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, stopStreaming, clearChat } = useMentorChat();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const suggestedPrompts = [
    prelimsKeywords.length > 0 ? `Explain ${prelimsKeywords[0]}` : null,
    "What's the mains angle here?",
    "Generate a practice question on this",
    "Simplify this topic for me",
  ].filter(Boolean) as string[];

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    // If first message, include article context
    const isFirst = messages.length === 0;
    const contextPrefix = isFirst
      ? `[Context: I'm reading an article titled "${articleTitle}". Summary: ${articleSummary.slice(0, 300)}. Topics: ${tags.join(", ")}. Key terms: ${prelimsKeywords.join(", ")}]\n\n`
      : "";
    await sendMessage(contextPrefix + text);
    setInput("");
  };

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Bot className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wider">AI Mentor</span>
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full glass-card rounded-xl p-4 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Have a doubt about this article?</p>
              <p className="text-xs text-muted-foreground">Ask the AI Mentor for explanations, mains angles, or practice questions</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass-card rounded-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">AI Mentor</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
              >
                <ChevronDown className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </div>

          {/* Auth gate */}
          {!user ? (
            <div className="p-6 text-center space-y-3">
              <Bot className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Sign in to ask questions</p>
              <Button asChild size="sm">
                <Link to="/auth" className="gap-2">
                  <LogIn className="h-3.5 w-3.5" /> Sign In
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="max-h-80 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center mb-3">Try one of these:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSend(prompt)}
                          disabled={isLoading}
                          className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.role === "user"
                        ? msg.content.replace(/^\[Context:.*?\]\n\n/, "")
                        : msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-xl px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend(input);
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    placeholder="Ask about this article..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="h-9 text-sm flex-1"
                    disabled={isLoading}
                  />
                  {isLoading ? (
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={stopStreaming}>
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim()}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </form>
              </div>
            </>
          )}
        </motion.div>
      )}
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
