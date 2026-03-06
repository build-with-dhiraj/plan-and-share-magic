import { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, FileText, Lightbulb, HelpCircle, Filter, ChevronDown, Layers, BookOpen, Globe, Shield, Leaf, Beaker, Scale, PenTool, Mountain, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

// ── UPSC GS Syllabus Taxonomy ──────────────────────────────────────────
const GS_PAPERS = [
  {
    paper: "GS-I",
    label: "History, Society & Geography",
    icon: BookOpen,
    color: "gs-tag-history",
    topics: ["History", "Art & Culture", "Society", "Geography", "World History"],
  },
  {
    paper: "GS-II",
    label: "Polity, Governance & IR",
    icon: Shield,
    color: "gs-tag-polity",
    topics: ["Polity", "Governance", "International Relations", "Social Justice"],
  },
  {
    paper: "GS-III",
    label: "Economy, S&T & Environment",
    icon: Leaf,
    color: "gs-tag-economy",
    topics: ["Economy", "Science & Tech", "Environment", "Security", "Disaster Management"],
  },
  {
    paper: "GS-IV",
    label: "Ethics & Integrity",
    icon: Scale,
    color: "gs-tag-ethics",
    topics: ["Ethics", "Integrity", "Aptitude"],
  },
] as const;

const CONTENT_LAYERS = [
  { key: "A", label: "Canonical (Gov)", desc: "PIB, PRS, NITI Aayog" },
  { key: "B", label: "Quality Media", desc: "The Hindu, Indian Express" },
  { key: "C", label: "Coaching", desc: "Benchmark compilations" },
  { key: "D", label: "Global Reports", desc: "UN, World Bank, IMF" },
] as const;

type ContentType = "all" | "articles" | "facts" | "mcqs";

// Map tag slugs to their GS paper for filtering
const TAG_TO_GS: Record<string, string> = {
  polity: "GS-II", governance: "GS-II", ir: "GS-II", international: "GS-II",
  economy: "GS-III", environment: "GS-III", science: "GS-III", security: "GS-III",
  ethics: "GS-IV",
  history: "GS-I", geography: "GS-I", society: "GS-I", culture: "GS-I",
};

// Normalize a syllabus tag to find its GS paper
function tagToGS(tag: string): string | null {
  const t = tag.toLowerCase();
  for (const gs of GS_PAPERS) {
    if (gs.topics.some((topic) => t.includes(topic.toLowerCase()))) return gs.paper;
  }
  if (t.includes("polity") || t.includes("governance") || t.includes("ir") || t.includes("international")) return "GS-II";
  if (t.includes("economy") || t.includes("environment") || t.includes("science") || t.includes("security")) return "GS-III";
  if (t.includes("ethics")) return "GS-IV";
  if (t.includes("history") || t.includes("geography") || t.includes("society") || t.includes("culture")) return "GS-I";
  return null;
}

function tagColorClass(tag: string): string {
  const t = tag.toLowerCase();
  if (t.includes("polity") || t.includes("governance")) return "gs-tag-polity";
  if (t.includes("economy")) return "gs-tag-economy";
  if (t.includes("environment") || t.includes("climate")) return "gs-tag-environment";
  if (t.includes("international") || t.includes("ir")) return "gs-tag-ir";
  if (t.includes("science") || t.includes("tech")) return "gs-tag-science";
  if (t.includes("ethics")) return "gs-tag-ethics";
  if (t.includes("essay")) return "gs-tag-essay";
  if (t.includes("history") || t.includes("culture")) return "gs-tag-history";
  if (t.includes("geography")) return "gs-tag-geography";
  if (t.includes("society") || t.includes("social")) return "gs-tag-society";
  return "";
}

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const tagParam = searchParams.get("tag");

  const [query, setQuery] = useState("");
  const [contentType, setContentType] = useState<ContentType>("all");
  const [selectedGS, setSelectedGS] = useState<string[]>([]);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Auto-apply tag from URL param on mount
  useEffect(() => {
    if (tagParam) {
      const gsKey = TAG_TO_GS[tagParam.toLowerCase()];
      if (gsKey) {
        setSelectedGS([gsKey]);
        setShowFilters(true);
      }
      // Also set query to the tag name for text-based filtering
      setQuery(tagParam.charAt(0).toUpperCase() + tagParam.slice(1));
    }
  }, [tagParam]);

  const debouncedQuery = useDebounce(query, 300);

  // ── Fetch articles ─────────────────────────────────────────────────
  const { data: articles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ["search-articles", debouncedQuery, selectedLayers],
    queryFn: async () => {
      let q = supabase.from("articles").select("id, title, summary, source_name, syllabus_tags, layer, published_at").eq("processed", true).not("summary", "is", null).order("published_at", { ascending: false }).limit(50);
      if (debouncedQuery) q = q.or(`title.ilike.%${debouncedQuery}%,summary.ilike.%${debouncedQuery}%`);
      if (selectedLayers.length) q = q.in("layer", selectedLayers);
      const { data } = await q;
      return data ?? [];
    },
    enabled: contentType === "all" || contentType === "articles",
  });

  // ── Fetch facts ────────────────────────────────────────────────────
  const { data: facts = [], isLoading: loadingFacts } = useQuery({
    queryKey: ["search-facts", debouncedQuery],
    queryFn: async () => {
      let q = supabase.from("facts").select("id, fact_text, source_url, syllabus_tags, confidence, verified").order("created_at", { ascending: false }).limit(50);
      if (debouncedQuery) q = q.ilike("fact_text", `%${debouncedQuery}%`);
      const { data } = await q;
      return data ?? [];
    },
    enabled: contentType === "all" || contentType === "facts",
  });

  // ── Fetch MCQs ─────────────────────────────────────────────────────
  const { data: mcqs = [], isLoading: loadingMCQs } = useQuery({
    queryKey: ["search-mcqs", debouncedQuery],
    queryFn: async () => {
      let q = supabase.from("mcq_bank").select("id, question, topic, difficulty, syllabus_tags, source, explanation").order("created_at", { ascending: false }).limit(50);
      if (debouncedQuery) q = q.or(`question.ilike.%${debouncedQuery}%,topic.ilike.%${debouncedQuery}%,explanation.ilike.%${debouncedQuery}%`);
      const { data } = await q;
      return data ?? [];
    },
    enabled: contentType === "all" || contentType === "mcqs",
  });

  const isLoading = loadingArticles || loadingFacts || loadingMCQs;

  // ── GS paper filter ────────────────────────────────────────────────
  const filterByGS = useCallback(
    (tags: string[] | null) => {
      if (!selectedGS.length) return true;
      if (!tags?.length) return false;
      return tags.some((t) => selectedGS.includes(tagToGS(t) ?? ""));
    },
    [selectedGS]
  );

  const filteredArticles = useMemo(() => articles.filter((a) => filterByGS(a.syllabus_tags)), [articles, filterByGS]);
  const filteredFacts = useMemo(() => facts.filter((f) => filterByGS(f.syllabus_tags)), [facts, filterByGS]);
  const filteredMCQs = useMemo(() => mcqs.filter((m) => filterByGS(m.syllabus_tags)), [mcqs, filterByGS]);

  const totalResults = filteredArticles.length + filteredFacts.length + filteredMCQs.length;
  const hasActiveFilters = selectedGS.length > 0 || selectedLayers.length > 0;

  const toggleGS = (gs: string) => setSelectedGS((prev) => (prev.includes(gs) ? prev.filter((g) => g !== gs) : [...prev, gs]));
  const toggleLayer = (l: string) => setSelectedLayers((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  const clearFilters = () => { setSelectedGS([]); setSelectedLayers([]); };

  return (
    <div className="container max-w-4xl py-4 sm:py-6 px-4 pb-24 lg:pb-6">
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
        <Input
          placeholder="Search issues, facts, MCQs... (e.g. Article 21, RBI policy, climate)"
          className="pl-11 pr-10 h-12 text-base bg-card border-border"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content type tabs + filter toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)} className="flex-1">
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="articles" className="text-xs flex items-center gap-1"><FileText className="h-3 w-3" />Articles</TabsTrigger>
            <TabsTrigger value="facts" className="text-xs flex items-center gap-1"><Lightbulb className="h-3 w-3" />Facts</TabsTrigger>
            <TabsTrigger value="mcqs" className="text-xs flex items-center gap-1"><HelpCircle className="h-3 w-3" />MCQs</TabsTrigger>
          </TabsList>
        </Tabs>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${hasActiveFilters ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && <span className="bg-primary-foreground text-primary rounded-full h-4 w-4 text-[10px] flex items-center justify-center font-bold">{selectedGS.length + selectedLayers.length}</span>}
          <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="p-4 mb-4 space-y-4 bg-card">
              {/* GS Paper filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-accent" /> GS Paper
                  </h4>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground">Clear all</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {GS_PAPERS.map((gs) => {
                    const Icon = gs.icon;
                    const active = selectedGS.includes(gs.paper);
                    return (
                      <button
                        key={gs.paper}
                        onClick={() => toggleGS(gs.paper)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${active ? "bg-primary/10 border-primary/40 text-foreground" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
                        <div>
                          <div className="font-semibold">{gs.paper}</div>
                          <div className="text-[10px] text-muted-foreground leading-tight">{gs.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Source layer filter */}
              {(contentType === "all" || contentType === "articles") && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Layers className="h-3.5 w-3.5 text-accent" /> Source Layer
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_LAYERS.map((layer) => {
                      const active = selectedLayers.includes(layer.key);
                      return (
                        <button
                          key={layer.key}
                          onClick={() => toggleLayer(layer.key)}
                          className={`px-3 py-1.5 rounded-full border text-xs transition-all ${active ? "bg-accent/15 border-accent/40 text-accent-foreground font-medium" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
                        >
                          <span className="font-bold mr-1">Layer {layer.key}:</span> {layer.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      {(query || hasActiveFilters) && !isLoading && (
        <p className="text-xs text-muted-foreground mb-3">
          {totalResults} result{totalResults !== 1 ? "s" : ""} found
          {hasActiveFilters && <> · <button onClick={clearFilters} className="text-primary hover:underline">clear filters</button></>}
        </p>
      )}

      {/* Results */}
      <div className="space-y-3">
        {isLoading && (
          <div className="text-center py-12 text-muted-foreground text-sm">Searching...</div>
        )}

      {!isLoading && !query && !hasActiveFilters && !tagParam && (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <Search className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm">Search across all issues, facts, and topics</p>
            <p className="text-xs">Try "Article 21", "RBI policy", or "climate change"</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {["Economy", "Polity", "Environment", "International Relations", "Science & Tech"].map((t) => (
                <button key={t} onClick={() => setQuery(t)} className="px-3 py-1 rounded-full border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Articles */}
        {(contentType === "all" || contentType === "articles") && filteredArticles.map((a) => (
          <Link key={`article-${a.id}`} to={`/issue/${a.id}`}>
            <Card className="p-4 bg-card hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Article</Badge>
                    {a.layer && <span className="text-[10px] text-muted-foreground font-medium">Layer {a.layer}</span>}
                    <span className="text-[10px] text-muted-foreground">{a.source_name}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{a.title}</h3>
                  {a.summary && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.summary}</p>}
                  {a.syllabus_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {a.syllabus_tags.slice(0, 4).map((tag: string) => (
                        <Badge key={tag} className={`${tagColorClass(tag)} border text-[10px] px-1.5 py-0`}>{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}

        {/* Facts */}
        {(contentType === "all" || contentType === "facts") && filteredFacts.map((f) => (
          <Card key={`fact-${f.id}`} className="p-4 bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                <Lightbulb className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Fact</Badge>
                  {f.verified && <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px] px-1.5 py-0">Verified</Badge>}
                  {f.confidence != null && <span className="text-[10px] text-muted-foreground">{Math.round(Number(f.confidence) * 100)}% confidence</span>}
                </div>
                <p className="text-sm text-foreground leading-snug">{f.fact_text}</p>
                {f.syllabus_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {f.syllabus_tags.slice(0, 4).map((tag: string) => (
                      <Badge key={tag} className={`${tagColorClass(tag)} border text-[10px] px-1.5 py-0`}>{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {/* MCQs */}
        {(contentType === "all" || contentType === "mcqs") && filteredMCQs.map((m) => (
          <Card key={`mcq-${m.id}`} className="p-4 bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <HelpCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">MCQ</Badge>
                  {m.difficulty && (
                    <Badge className={`text-[10px] px-1.5 py-0 border ${m.difficulty === "hard" ? "bg-destructive/15 text-destructive border-destructive/30" : m.difficulty === "easy" ? "bg-green-500/15 text-green-600 border-green-500/30" : "bg-accent/15 text-accent-foreground border-accent/30"}`}>
                      {m.difficulty}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">{m.topic}</span>
                </div>
                <p className="text-sm text-foreground leading-snug line-clamp-2">{m.question}</p>
                {m.syllabus_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.syllabus_tags.slice(0, 4).map((tag: string) => (
                      <Badge key={tag} className={`${tagColorClass(tag)} border text-[10px] px-1.5 py-0`}>{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {!isLoading && (query || hasActiveFilters) && totalResults === 0 && (
          <div className="text-center py-12 text-muted-foreground space-y-1">
            <p className="text-sm">No results found</p>
            <p className="text-xs">Try different keywords or adjust your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple debounce hook
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default SearchPage;
