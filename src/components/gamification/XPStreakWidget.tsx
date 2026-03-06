import { Flame, Zap } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

export function XPStreakWidget() {
  const { totalXP, currentStreak, loading } = useDashboardData();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 text-accent">
        <Flame className="h-4 w-4 animate-streak-pulse" />
        <span className="text-sm font-bold">{loading ? "…" : currentStreak}</span>
      </div>
      <div className="flex items-center gap-1 text-gs-polity">
        <Zap className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold">{loading ? "…" : totalXP} XP</span>
      </div>
    </div>
  );
}
