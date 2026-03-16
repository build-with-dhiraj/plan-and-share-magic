import { useState, useMemo } from "react";
import { Bookmark, Loader2, Trash2, LogIn, Search, Filter, ArrowRight, Calendar, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, isThisWeek, subDays } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";

const TOPIC_FILTERS = ["Polity", "Economy", "S&T", "IR", "Environment"];

const SavedPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const { data: bookmarks = [], isLoading: isLoadingBookmarks } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .eq("item_type", "article")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const articleIds = bookmarks.map((b: any) => b.item_id);
  const { data: articles = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ["bookmarked-articles", articleIds],
    queryFn: async () => {
      if (articleIds.length === 0) return [];
      const { data } = await supabase
        .from("articles")
        .select("id, title, summary, syllabus_tags, source_name, published_at")
        .in("id", articleIds);
      return data ?? [];
    },
    enabled: articleIds.length > 0,
  });

  const removeBookmark = useMutation({
    mutationFn: async (bookmarkId: string) => {
      await supabase.from("bookmarks").delete().eq("id", bookmarkId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  const articleMap = useMemo(() => new Map(articles.map((a: any) => [a.id, a])), [articles]);

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bk: any) => {
      const article = articleMap.get(bk.item_id);
      if (!article) return false;

      const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           article.summary?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTopic = !activeTopic || 
                          (article.syllabus_tags && article.syllabus_tags.some((t: string) => t.toLowerCase().includes(activeTopic.toLowerCase())));

      return matchesSearch && matchesTopic;
    });
  }, [bookmarks, articleMap, searchQuery, activeTopic]);

  const groupedBookmarks = useMemo(() => {
    const groups: Record<string, any[]> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Older: []
    };

    filteredBookmarks.forEach(bk => {
      const date = new Date(bk.created_at);
      if (isToday(date)) groups.Today.push(bk);
      else if (isYesterday(date)) groups.Yesterday.push(bk);
      else if (isThisWeek(date)) groups["This Week"].push(bk);
      else groups.Older.push(bk);
    });

    return groups;
  }, [filteredBookmarks]);

  if (!user) {
    return (
      <div className="container max-w-2xl py-20 px-4 text-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <Bookmark className="h-10 w-10 text-muted-foreground opacity-30" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Sign in to save articles</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
          Build your personal revision library by bookmarking important news and analysis.
        </p>
        <Button asChild className="h-12 px-8 font-bold text-base">
          <Link to="/auth" className="gap-2"><LogIn className="h-5 w-5" /> Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 px-4 pb-24 lg:pb-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Revision Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Found {filteredBookmarks.length} saved articles</p>
      </header>

      {/* SEARCH AND FILTERS */}
      <section className="space-y-4 mb-8">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <Input 
            placeholder="Search your saved articles..." 
            className="pl-10 h-11 bg-card border-border/50 focus-visible:ring-accent/30 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
          <button
            onClick={() => setActiveTopic(null)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all",
              !activeTopic ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border"
            )}
          >
            All
          </button>
          {TOPIC_FILTERS.map(topic => (
            <button
              key={topic}
              onClick={() => setActiveTopic(activeTopic === topic ? null : topic)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all",
                activeTopic === topic ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border"
              )}
            >
              {topic}
            </button>
          ))}
        </div>
      </section>

      {isLoadingBookmarks || (isLoadingArticles && articleIds.length > 0) ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="text-center py-20 px-6 border-2 border-dashed border-border rounded-2xl bg-muted/20">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark className="h-8 w-8 text-muted-foreground opacity-20" />
          </div>
          <h2 className="text-lg font-bold">No results found</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
            Try adjusting your search or filters to find what you're looking for.
          </p>
          {(searchQuery || activeTopic) && (
            <Button 
              variant="link" 
              onClick={() => { setSearchQuery(""); setActiveTopic(null); }}
              className="text-accent mt-4 font-bold"
            >
              Clear all filters
            </Button>
          )}
          {bookmarks.length === 0 && !searchQuery && !activeTopic && (
            <Button asChild className="mt-6 h-11 font-bold">
              <Link to="/">Explore Today's Brief <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedBookmarks).map(([group, groupItems]) => {
            if (groupItems.length === 0) return null;
            return (
              <section key={group} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{group}</h3>
                  <div className="h-px bg-border flex-1" />
                </div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {groupItems.map(bk => {
                      const article = articleMap.get(bk.item_id);
                      if (!article) return null;
                      return (
                        <motion.div
                          key={bk.id}
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group relative glass-card rounded-2xl overflow-hidden p-4 border-l-4 border-l-transparent hover:border-l-accent hover:shadow-md transition-all active:scale-[0.99]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <Link to={`/issue/${bk.item_id}`} className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] uppercase font-bold text-accent tracking-tighter">{article.source_name || "Daily Brief"}</span>
                                <span className="text-[10px] text-muted-foreground">•</span>
                                <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(article.published_at || bk.created_at), "d MMM yyyy")}</span>
                              </div>
                              <h4 className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                                {article.title}
                              </h4>
                              {article.summary && (
                                <p className="text-[12px] text-muted-foreground line-clamp-1 mt-1 font-medium">
                                  {article.summary}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {article.syllabus_tags?.slice(0, 2).map((tag: string) => (
                                  <span key={tag} className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-muted rounded border text-muted-foreground">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </Link>
                            <button
                              onClick={(e) => { e.preventDefault(); removeBookmark.mutate(bk.id); }}
                              className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                              aria-label="Remove bookmark"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedPage;
