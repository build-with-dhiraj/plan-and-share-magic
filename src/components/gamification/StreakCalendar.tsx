import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayData {
  date: string; // YYYY-MM-DD
  completed: boolean;
  xp: number;
  score?: number;
}

interface StreakCalendarProps {
  className?: string;
}

// Generate mock activity data for the last 12 weeks
function generateMockData(): DayData[] {
  const data: DayData[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 83); // ~12 weeks

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split("T")[0];
    // Simulate ~60% completion rate with some streaks
    const dayOfWeek = d.getDay();
    const weekNum = Math.floor((today.getTime() - d.getTime()) / (7 * 86400000));
    const rand = Math.sin(d.getTime() / 86400000 * 2.5) * 0.5 + 0.5;
    const completed = rand > 0.35 && dayOfWeek !== 0; // rarely on Sundays
    const xp = completed ? Math.floor(30 + rand * 70) : 0;
    const score = completed ? Math.floor(2 + rand * 3) : 0;

    data.push({ date: key, completed, xp, score });
  }
  return data;
}

const WEEKDAYS = ["M", "", "W", "", "F", "", ""];

function getIntensity(xp: number): number {
  if (xp === 0) return 0;
  if (xp < 40) return 1;
  if (xp < 60) return 2;
  if (xp < 80) return 3;
  return 4;
}

export function StreakCalendar({ className }: StreakCalendarProps) {
  const data = useMemo(() => generateMockData(), []);

  // Build week columns
  const weeks = useMemo(() => {
    const cols: DayData[][] = [];
    let currentWeek: DayData[] = [];

    // Pad the first week so it starts on Monday
    const firstDay = new Date(data[0].date).getDay();
    const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < mondayOffset; i++) {
      currentWeek.push({ date: "", completed: false, xp: 0 });
    }

    data.forEach((d) => {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        cols.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: "", completed: false, xp: 0 });
      }
      cols.push(currentWeek);
    }
    return cols;
  }, [data]);

  // Stats
  const stats = useMemo(() => {
    const completed = data.filter((d) => d.completed);
    const totalXP = completed.reduce((s, d) => s + d.xp, 0);

    // Current streak
    let streak = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].completed) streak++;
      else break;
    }

    // Longest streak
    let longest = 0;
    let curr = 0;
    data.forEach((d) => {
      if (d.completed) {
        curr++;
        longest = Math.max(longest, curr);
      } else {
        curr = 0;
      }
    });

    return { totalXP, completedDays: completed.length, totalDays: data.length, streak, longest };
  }, [data]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; colIndex: number }[] = [];
    let lastMonth = "";
    weeks.forEach((week, i) => {
      const firstValid = week.find((d) => d.date);
      if (firstValid && firstValid.date) {
        const m = new Date(firstValid.date).toLocaleDateString("en-IN", { month: "short" });
        if (m !== lastMonth) {
          labels.push({ label: m, colIndex: i });
          lastMonth = m;
        }
      }
    });
    return labels;
  }, [weeks]);

  const intensityClasses = [
    "bg-muted",
    "bg-accent/20",
    "bg-accent/40",
    "bg-accent/65",
    "bg-accent",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card rounded-2xl p-5 space-y-4", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <Flame className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Activity Streak</h3>
            <p className="text-[11px] text-muted-foreground">Daily challenge completions</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center gap-1 bg-accent/15 text-accent text-xs font-bold px-2.5 py-1 rounded-full"
          >
            <Flame className="h-3.5 w-3.5" />
            {stats.streak} day streak
          </motion.div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Zap, label: "Total XP", value: stats.totalXP.toLocaleString(), color: "text-accent" },
          { icon: Trophy, label: "Best Streak", value: `${stats.longest} days`, color: "text-[hsl(var(--gs-economy))]" },
          { icon: Flame, label: "Completed", value: `${stats.completedDays}/${stats.totalDays}`, color: "text-[hsl(var(--gs-ir))]" },
        ].map((s) => (
          <div key={s.label} className="bg-muted/50 rounded-xl p-2.5 text-center">
            <s.icon className={cn("h-3.5 w-3.5 mx-auto mb-1", s.color)} />
            <p className={cn("text-sm font-bold", s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="space-y-1.5">
        {/* Month labels */}
        <div className="flex pl-5">
          <div className="flex gap-[3px]" style={{ width: "100%" }}>
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="text-[10px] text-muted-foreground"
                style={{
                  position: "relative",
                  left: `${(m.colIndex / weeks.length) * 100}%`,
                }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] pr-1.5 pt-0">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="h-[13px] flex items-center">
                <span className="text-[9px] text-muted-foreground w-3">{d}</span>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[3px] flex-1 overflow-hidden">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => {
                  const intensity = getIntensity(day.xp);
                  return (
                    <motion.div
                      key={`${wi}-${di}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: wi * 0.02 + di * 0.01 }}
                      className={cn(
                        "h-[13px] w-[13px] rounded-[3px] transition-colors",
                        day.date ? intensityClasses[intensity] : "bg-transparent",
                        day.date && "hover:ring-1 hover:ring-accent/50 cursor-pointer"
                      )}
                      title={day.date ? `${day.date}: ${day.xp} XP` : ""}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 pt-1">
          <span className="text-[10px] text-muted-foreground">Less</span>
          {intensityClasses.map((cls, i) => (
            <div key={i} className={cn("h-[11px] w-[11px] rounded-[2px]", cls)} />
          ))}
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>
    </motion.div>
  );
}
