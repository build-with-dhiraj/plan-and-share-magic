import { Layers } from "lucide-react";

export function SourceBadge({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
      <Layers className="h-3 w-3" />
      {count} {count === 1 ? "source" : "sources"}
    </span>
  );
}
