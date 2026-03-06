import { Layers } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export function SourceBadge({ count }: { count: number }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium cursor-help">
            <Layers className="h-3 w-3" />
            {count} {count === 1 ? "source" : "sources"}
          </span>
        </TooltipTrigger>
        <TooltipContent>Number of source articles analyzed</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
