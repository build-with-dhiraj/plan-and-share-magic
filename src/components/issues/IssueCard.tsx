import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, RotateCcw, ChevronRight } from "lucide-react";
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
  confidence: number | null;
  staticAnchor?: string;
  isHero?: boolean;
}

export function IssueCard({ id, title, synopsis, gsTags, sourceCount, confidence, staticAnchor, isHero }: IssueCardProps) {
  return (
    <Link to={`/issue/${id}`}>
      <motion.div
        className={`glass-card rounded-xl overflow-hidden cursor-pointer group transition-shadow hover:shadow-lg ${isHero ? "p-5 sm:p-6" : "p-4"}`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
      >
        <div className="flex items-start gap-1.5 mb-2 flex-wrap">
          {gsTags.map((tag) => (
            <SyllabusTagChip key={tag} tag={tag} />
          ))}
        </div>

        <h3 className={`font-semibold text-foreground leading-snug mb-1.5 ${isHero ? "text-lg sm:text-xl" : "text-[15px] sm:text-base"}`}>
          {title}
        </h3>

        <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed mb-2.5 line-clamp-3">{synopsis}</p>

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
            <button
              className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-90 transition-all"
              onClick={(e) => { e.preventDefault(); }}
              aria-label="Bookmark"
            >
              <Bookmark className="h-4 w-4" />
            </button>
            <button
              className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-90 transition-all"
              onClick={(e) => { e.preventDefault(); }}
              aria-label="Revise later"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors ml-0.5" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
