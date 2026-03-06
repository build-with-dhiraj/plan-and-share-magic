import { Flame, Zap } from "lucide-react";

interface XPStreakWidgetProps {
  streak: number;
  xp: number;
}

export function XPStreakWidget({ streak, xp }: XPStreakWidgetProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 text-accent">
        <Flame className="h-4 w-4 animate-streak-pulse" />
        <span className="text-sm font-bold">{streak}</span>
      </div>
      <div className="flex items-center gap-1 text-gs-polity">
        <Zap className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold">{xp} XP</span>
      </div>
    </div>
  );
}
