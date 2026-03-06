import { Shield } from "lucide-react";

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 85 ? "text-gs-economy" : pct >= 70 ? "text-accent" : "text-muted-foreground";

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <Shield className="h-3 w-3" />
      {pct}%
    </span>
  );
}
