import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, RotateCcw, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SyllabusTagChip } from "./SyllabusTagChips";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SourceBadge } from "./SourceBadge";

export type GsTag = "polity" | "economy" | "environment" | "ir" | "science" | "ethics" | "essay" | "history" | "geography" | "society";

interface IssueCardProps {
  id: string;
  title: string;
  synopsis: string;
  gsTags: readonly GsTag[];
  sourceCount: number;
  confidence: number;
  staticAnchor?: string;
  isHero?: boolean;
}

export function IssueCard({ id, title, synopsis, gsTags, sourceCount, confidence, staticAnchor, isHero }: IssueCardProps) {
  return (
    <Link to={`/issue/${id}`}>
      <motion.div
        className={`glass-card rounded-xl overflow-hidden cursor-pointer group transition-shadow hover:shadow-lg ${isHero ? "p-6" : "p-4"}`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-start gap-2 mb-2 flex-wrap">
          {gsTags.map((tag) => (
            <SyllabusTagChip key={tag} tag={tag} />
          ))}
        </div>

        <h3 className={`font-semibold text-foreground leading-snug mb-2 ${isHero ? "text-xl" : "text-base"}`}>
          {title}
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{synopsis}</p>

        {staticAnchor && (
          <p className="text-xs text-accent font-medium mb-3">
            📎 Revise: {staticAnchor}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SourceBadge count={sourceCount} />
            <ConfidenceBadge confidence={confidence} />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.preventDefault(); }}
            >
              <Bookmark className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.preventDefault(); }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
