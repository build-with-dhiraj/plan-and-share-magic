import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, PenTool, Clock, ExternalLink, Loader2, Lightbulb, HelpCircle, ArrowLeft } from "lucide-react";

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

const IssuePage = () => {
  const { id } = useParams();

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

  // Check for junk / error-page articles
  const isJunk = article && /^(404|403|500)\b|not\s*found|access\s*denied|error\s*page|sorry.*inconvenience|cloudflare|captcha/i.test(article.title);

  if (!article || isJunk) {
    return (
      <div className="container max-w-4xl py-6 px-4 text-center text-muted-foreground">
        <p>Article not found.</p>
      </div>
    );
  }

  const tags = article.syllabus_tags ?? [];
  const timeSince = article.published_at
    ? formatTimeSince(new Date(article.published_at))
    : article.ingested_at
    ? formatTimeSince(new Date(article.ingested_at))
    : "";

  return (
    <div className="container max-w-4xl py-4 sm:py-6 px-4">
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          {tags.map((tag: string) => (
            <Badge key={tag} className={`${tagColorClass(tag)} border text-xs`}>{tag}</Badge>
          ))}
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight mb-2.5">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs sm:text-sm">
          {timeSince && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {timeSince}</span>}
          <span>{article.source_name}</span>
          {article.layer && <span>Layer {article.layer}</span>}
        </div>
      </div>

      {article.summary && (
        <div className="glass-card rounded-xl p-5 mb-5">
          <p className="text-sm text-foreground leading-relaxed">{article.summary}</p>
        </div>
      )}

      <Tabs defaultValue="facts" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-5 h-11">
          <TabsTrigger value="facts" className="flex items-center gap-1.5 text-xs sm:text-sm h-9">
            <Lightbulb className="h-3.5 w-3.5" /> Facts ({facts.length})
          </TabsTrigger>
          <TabsTrigger value="mcqs" className="flex items-center gap-1.5 text-xs sm:text-sm h-9">
            <HelpCircle className="h-3.5 w-3.5" /> MCQs ({mcqs.length})
          </TabsTrigger>
          <TabsTrigger value="source" className="flex items-center gap-1.5 text-xs sm:text-sm h-9">
            <ExternalLink className="h-3.5 w-3.5" /> Source
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facts" className="space-y-3">
          {facts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No facts extracted yet.</p>
          ) : (
            facts.map((f: any) => (
              <div key={f.id} className="glass-card rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <div>
                    <p className="text-sm text-foreground">{f.fact_text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {f.confidence && (
                        <span className="text-[10px] text-muted-foreground">{Math.round(Number(f.confidence) * 100)}% confidence</span>
                      )}
                      {f.verified && <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">Verified</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="mcqs" className="space-y-3">
          {mcqs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No MCQs generated yet.</p>
          ) : (
            mcqs.map((m: any, i: number) => (
              <div key={m.id} className="glass-card rounded-xl p-4">
                <p className="text-sm font-medium text-foreground mb-2">Q{i + 1}: {m.question}</p>
                <div className="space-y-1.5 mb-3">
                  {m.options.map((opt: string, oi: number) => (
                    <div key={oi} className={`text-xs px-3 py-2 rounded-lg border ${oi === m.correct_index ? "border-green-500/40 bg-green-500/10 text-foreground" : "border-border text-muted-foreground"}`}>
                      {String.fromCharCode(65 + oi)}. {opt}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground"><strong>Explanation:</strong> {m.explanation}</p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="source" className="space-y-3">
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-3">Original Source</h3>
            <p className="text-sm text-muted-foreground mb-3">{article.source_name}</p>
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Read original article
            </a>
          </div>
          {article.content && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-3">Full Content</h3>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto">
                {article.content.slice(0, 3000)}
                {article.content.length > 3000 && "..."}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

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
