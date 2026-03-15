import { Bookmark, Loader2, Trash2, LogIn } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SavedPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookmarks = [], isLoading } = useQuery({
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

  // Fetch article details for bookmarked IDs
  const articleIds = bookmarks.map((b: any) => b.item_id);
  const { data: articles = [] } = useQuery({
    queryKey: ["bookmarked-articles", articleIds],
    queryFn: async () => {
      if (articleIds.length === 0) return [];
      const { data } = await supabase
        .from("articles")
        .select("id, title, summary, syllabus_tags, source_name")
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

  const articleMap = new Map(articles.map((a: any) => [a.id, a]));

  return (
    <div className="container max-w-3xl py-4 sm:py-6 px-4 pb-24 lg:pb-6">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-1">Saved</h1>
      <p className="text-sm text-muted-foreground mb-6">Your bookmarked issues</p>

      {!user ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Bookmark className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm font-medium text-foreground mb-1">Sign in to see your bookmarks</p>
          <p className="text-xs mb-4">Bookmark articles from the daily brief and access them here</p>
          <Button asChild>
            <Link to="/auth" className="gap-2">
              <LogIn className="h-4 w-4" /> Sign In
            </Link>
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Bookmark className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">No saved issues yet</p>
          <p className="text-xs mt-1">Bookmark issues from the daily brief to see them here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bk: any) => {
            const article = articleMap.get(bk.item_id);
            return (
              <div key={bk.id} className="glass-card rounded-xl p-4 flex items-start gap-3">
                <Link to={`/issue/${bk.item_id}`} className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2">
                    {article?.title || "Untitled article"}
                  </h3>
                  {article?.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{article.summary}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {article?.source_name} · Saved {new Date(bk.created_at).toLocaleDateString()}
                  </p>
                </Link>
                <button
                  onClick={() => removeBookmark.mutate(bk.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  aria-label="Remove bookmark"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedPage;
