import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, RotateCcw, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SyllabusTagChip } from "./SyllabusTagChips";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SourceBadge } from "./SourceBadge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GsTag = "polity" | "economy" | "environment" | "ir" | "science" | "ethics" | "essay" | "history" | "geography" | "society";

interface IssueCardProps {
  id: string;
  title: string;
  synopsis: string;
  gsTags: readonly GsTag[];
  gsPapers?: string[];
  prelimsKeywords?: string[];
  hasMainsAngle?: boolean;
  depthTier?: string | null;
  sourceCount: number;
  confidence: number | null;
  staticAnchor?: string;
  isHero?: boolean;
}

const TIER_LABELS: Record<string, string> = {
  deep_analysis: "In Depth",
  important_facts: "Key Facts",
  rapid_fire: "Quick Bites",
};

const GS_PAPER_COLORS: Record<string, string> = {
  "GS-1": "gs-tag-history",
  "GS-2": "gs-tag-polity",
  "GS-3": "gs-tag-economy",
  "GS-4": "gs-tag-ethics",
};

export function IssueCard({ id, title, synopsis, gsTags, gsPapers = [], prelimsKeywords = [], hasMainsAngle, depthTier, sourceCount, confidence, staticAnchor, isHero }: IssueCardProps) {
  const { user } = useAuth();
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
      if (!user) { toast.error("Sign in to bookmark"); return; }
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
        className={`glass-card rounded-xl overflow-hidden cursor-pointer group transition-shadow hover:shadow-lg ${isHero ? "p-5 sm:p-6" : "p-4"}`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
      >
        <div className="flex items-start gap-1.5 mb-1.5 flex-wrap">
          {gsPapers.map((paper) => (
            <Badge key={paper} variant="outline" className={`${GS_PAPER_COLORS[paper] || ""} border text-[10px] px-2 py-0.5 font-semibold`}>
              {paper}
            </Badge>
          ))}
          {gsTags.map((tag) => (
            <SyllabusTagChip key={tag} tag={tag} />
          ))}
        </div>

        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {prelimsKeywords.length > 0 && (
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30 px-1.5 py-0">Prelims</Badge>
          )}
          {hasMainsAngle && (
            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30 px-1.5 py-0">Mains</Badge>
          )}
          {depthTier && TIER_LABELS[depthTier] && (
            <span className="text-[10px] text-muted-foreground font-medium">{TIER_LABELS[depthTier]}</span>
          )}
        </div>

        <h3 className={`font-semibold text-foreground leading-snug mb-1.5 ${isHero ? "text-lg sm:text-xl" : "text-[15px] sm:text-base"}`}>
          {title}
        </h3>

        <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed mb-1.5 line-clamp-3">{synopsis}</p>

        {prelimsKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {prelimsKeywords.slice(0, 3).map((kw) => (
              <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{kw}</span>
            ))}
            {prelimsKeywords.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{prelimsKeywords.length - 3} more</span>
            )}
          </div>
        )}

        {staticAnchor && (
          <p className="text-xs text-accent font-medium mb-2.5 line-clamp-1">
            📎 Revise: {staticAnchor}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SourceBadge count={sourceCount} />
            {confidence != null && <ConfidenceBadge confidence={confidence} />}
          </div>
          <div className="flex items-center gap-0">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`h-9 w-9 flex items-center justify-center rounded-full active:scale-90 transition-all ${isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark.mutate(); }}
                    aria-label={isBookmarked ? "Remove bookmark" : "Save to bookmarks"}
                  >
                    {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{isBookmarked ? "Remove bookmark" : "Save to bookmarks"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-90 transition-all"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast.info("Added to revision queue"); }}
                    aria-label="Add to revision queue"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Add to revision queue</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors ml-0.5" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
