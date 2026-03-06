import { Badge } from "@/components/ui/badge";
import type { GsTag } from "./IssueCard";

const TAG_CONFIG: Record<GsTag, { label: string; className: string }> = {
  polity: { label: "Polity", className: "gs-tag-polity" },
  economy: { label: "Economy", className: "gs-tag-economy" },
  environment: { label: "Environment", className: "gs-tag-environment" },
  ir: { label: "IR", className: "gs-tag-ir" },
  science: { label: "S&T", className: "gs-tag-science" },
  ethics: { label: "Ethics", className: "gs-tag-ethics" },
  essay: { label: "Essay", className: "gs-tag-essay" },
  history: { label: "History", className: "gs-tag-history" },
  geography: { label: "Geography", className: "gs-tag-geography" },
  society: { label: "Society", className: "gs-tag-society" },
};

export function SyllabusTagChip({ tag }: { tag: GsTag }) {
  const config = TAG_CONFIG[tag];
  return (
    <Badge variant="outline" className={`${config.className} border text-[10px] px-2 py-0.5 font-semibold`}>
      {config.label}
    </Badge>
  );
}
