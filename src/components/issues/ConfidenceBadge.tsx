import { Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 85 ? "text-gs-economy" : pct >= 70 ? "text-accent" : "text-muted-foreground";

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`flex items-center gap-1 text-xs font-medium ${color} cursor-help`}>
            <Shield className="h-3 w-3" />
            {pct}%
          </span>
        </TooltipTrigger>
        <TooltipContent>AI confidence score</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
