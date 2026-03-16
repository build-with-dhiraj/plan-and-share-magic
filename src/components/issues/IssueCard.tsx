import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SyllabusTagChip } from "./SyllabusTagChips";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GS_PAPER_COLORS, type GsTag } from "@/lib/tags";
import { toast } from "sonner";

interface IssueCardProps {
  id: string;
  title: string;
  synopsis: string;
  gsTags: readonly GsTag[];
  gsPapers?: string[];
  sourceCount: number;
  confidence: number | null;
  depthTier?: string | null;
}

const DEPTH_TIER_BORDER: Record<string, string> = {
  deep_analysis: "border-l-accent",
  important_facts: "border-l-primary",
  rapid_fire: "border-l-muted-foreground/30",
};

const DEPTH_TIER_LABEL: Record<string, string> = {
  deep_analysis: "In Depth",
  important_facts: "Key Facts",
  rapid_fire: "Quick Bite",
};

export function IssueCard({
  id,
  title,
  synopsis,
  gsTags,
  gsPapers = [],
  sourceCount,
  confidence,
  depthTier,
}: IssueCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: isBookmarked = false } = useQuery({
    queryKey: ["bookmark-status", user?.id, id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_id", id)
        .eq("item_type", "article")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error("Sign in to bookmark", { action: { label: "Sign in", onClick: () => navigate("/auth", { state: { from: `/issue/${id}` } }) } });
        return;
      }
      if (isBookmarked) {
        await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("item_id", id).eq("item_type", "article");
      } else {
        await supabase.from("bookmarks").insert({ user_id: user.id, item_id: id, item_type: "article" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark-status", user?.id, id] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success(isBookmarked ? "Bookmark removed" : "Bookmarked!");
    },
  });

  return (
    <Link to={`/issue/${id}`}>
      <motion.div
        className={`glass-card rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 hover:shadow-lg p-4 border-l-[3px] ${
          depthTier ? DEPTH_TIER_BORDER[depthTier] || "border-l-transparent" : "border-l-transparent"
        }`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
      >
        <div className="flex items-start gap-1.5 mb-2 flex-wrap">
          {depthTier && DEPTH_TIER_LABEL[depthTier] && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium border-muted-foreground/30 text-muted-foreground">
              {DEPTH_TIER_LABEL[depthTier]}
            </Badge>
          )}
          {gsPapers.map((paper) => (
            <Badge
              key={paper}
              variant="outline"
              className={`${GS_PAPER_COLORS[paper] || ""} border text-xs px-2 py-0.5 font-semibold`}
            >
              {paper}
            </Badge>
          ))}
          {gsTags.map((tag) => (
            <SyllabusTagChip key={tag} tag={tag} />
          ))}
        </div>

        <h3 className="font-semibold text-foreground leading-snug mb-1.5 text-base">
          {title}
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed mb-2.5 line-clamp-3">{synopsis}</p>

        <div className="flex items-center justify-end">
          <div className="flex items-center gap-0">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`h-9 w-9 flex items-center justify-center rounded-full active:scale-90 transition-all ${isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleBookmark.mutate();
                    }}
                    aria-label={isBookmarked ? "Remove bookmark" : "Save to bookmarks"}
                  >
                    {isBookmarked ? (
                      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                        <BookmarkCheck className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <Bookmark className="h-5 w-5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{isBookmarked ? "Remove bookmark" : "Save to bookmarks"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-accent transition-colors ml-0.5" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
