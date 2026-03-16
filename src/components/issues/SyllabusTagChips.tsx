import { Badge } from "@/components/ui/badge";
import { TAG_DISPLAY, type GsTag } from "@/lib/tags";

export function SyllabusTagChip({ tag }: { tag: GsTag }) {
  const config = TAG_DISPLAY[tag];
  if (!config) return null;
  return (
    <Badge variant="outline" className={`${config.className} border text-xs px-2 py-0.5 font-semibold`}>
      {config.label}
    </Badge>
  );
}
