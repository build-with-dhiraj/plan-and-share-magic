import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IssueCard } from "@/components/issues/IssueCard";
import {
  CheckCircle, Loader2, ArrowRight, ChevronLeft, ChevronRight,
  Flame, Zap, BookOpen, TrendingUp, ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, addDays, subDays, isToday as isTodayFn } from "date-fns";
import { DateStrip } from "@/components/dates/DateStrip";
import { DateCalendarPicker } from "@/components/dates/DateCalendarPicker";
import { useDateArticles } from "@/hooks/useDateArticles";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// Quick filter definitions — Additive Lozenges / Chips
const QUICK_FILTERS = [
  { key: "all", label: "All" },
  { key: "GS-1", label: "GS-I", color: "gs-tag-history" },
  { key: "GS-2", label: "GS-II", color: "gs-tag-polity" },
  { key: "GS-3", label: "GS-III", color: "gs-tag-economy" },
  { key: "GS-4", label: "GS-IV", color: "gs-tag-ethics" },
] as const;

const TIER_PRIORITY: Record<string, number> = {
  deep_analysis: 0,
  important_facts: 1,
  rapid_fire: 2,
};

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [statsExpanded, setStatsExpanded] = useState(false);
  const { user, profile } = useAuth();
  const dashData = useDashboardData();

  // Compute accuracy for stats strip
  const coveragePercent = (() => {
    const topics = Object.values(dashData.topicCoverage);
    if (topics.length === 0) return 0;
    const total = topics.reduce((s, t) => s + t.total, 0);
    const correct = topics.reduce((s, t) => s + t.correct, 0);
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  })();

  // Read date from URL param, validate it
  const dateParam = searchParams.get("date");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  let selectedDate: string | null = null;
  if (dateParam) {
    try {
      const parsed = parseISO(dateParam);
      if (!isNaN(parsed.getTime()) && parsed <= new Date()) {
        selectedDate = dateParam;
      }
    } catch {
      // invalid date, ignore
    }
  }

  // If date param equals today, treat as null (today mode)
  if (selectedDate === todayStr) selectedDate = null;

  const { articles, isLoading, isToday } = useDateArticles(selectedDate);

  const displayDate = selectedDate ? parseISO(selectedDate) : new Date();
  const displayDateStr = selectedDate || todayStr;

  const handleDateSelect = (dateStr: string) => {
    const todayString = format(new Date(), "yyyy-MM-dd");
    if (dateStr === todayString) {
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ date: dateStr }, { replace: false });
    }
  };

  const handleCalendarSelect = (date: Date) => {
    handleDateSelect(format(date, "yyyy-MM-dd"));
  };

  const goToToday = () => {
    setSearchParams({}, { replace: false });
  };

  // Adjacent date navigation for empty states
  const prevDateStr = format(subDays(displayDate, 1), "yyyy-MM-dd");
  const nextDate = addDays(displayDate, 1);
  const nextDateStr = format(nextDate, "yyyy-MM-dd");
  const canGoNext = nextDate <= new Date();

  // Sort articles by tier priority (high-relevance first)
  const sortedArticles = useMemo(() =>
    [...articles].sort((a, b) => {
      const pa = TIER_PRIORITY[a.depthTier ?? ""] ?? 3;
      const pb = TIER_PRIORITY[b.depthTier ?? ""] ?? 3;
      return pa - pb;
    }),
    [articles]
  );

  // Apply quick filter
  const filteredArticles = useMemo(() => {
    if (activeFilter === "all") return sortedArticles;
    return sortedArticles.filter((a) =>
      a.gsPapers?.some((p) => {
        // Normalize "GS-I" style from filter to "GS-1" style in data
        const filterNorm = activeFilter.replace("GS-", "");
        const paperNorm = p.replace("GS-", "");
        return filterNorm === paperNorm;
      })
    );
  }, [sortedArticles, activeFilter]);

  const filterCount = filteredArticles.length;

  // Time-aware greeting
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="container max-w-3xl py-4 sm:py-6 px-4 pb-24 lg:pb-6">
      {/* Header — F-pattern: high impact info upper-left */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {profile?.display_name ? `${greeting}, ${profile.display_name.split(" ")[0]}` : "Today's Brief"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {displayDate.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          {!isToday && (
            <button
              onClick={goToToday}
              className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-all duration-150 active:scale-95"
            >
              Back to Today <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Stats — F-pattern: Streak + Target prominent, rest progressive */}
      {user && !dashData.loading && (
        <div className="mb-3 sm:mb-4">
          {/* Primary stats: always visible (F-pattern upper-left) */}
          <div className="flex items-center gap-2 mb-2">
            <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2.5 flex-1">
              <div className="h-9 w-9 rounded-lg bg-accent/15 flex items-center justify-center">
                <Flame className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-lg font-bold text-accent leading-none">{dashData.currentStreak}d</p>
                <p className="text-xs text-muted-foreground mt-0.5">Streak</p>
              </div>
            </div>
            <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2.5 flex-1">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{articles.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Articles Today</p>
              </div>
            </div>
            {/* Expand button */}
            <button
              onClick={() => setStatsExpanded(!statsExpanded)}
              className="glass-card rounded-xl h-[58px] w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-95"
              aria-label="Show more stats"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", statsExpanded && "rotate-180")} />
            </button>
          </div>

          {/* Secondary stats — Progressive Disclosure: hidden by default */}
          <AnimatePresence>
            {statsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Total XP", value: String(dashData.totalXP), icon: Zap, color: "text-accent" },
                    { label: "Quizzes", value: String(dashData.quizzesCompleted), icon: BookOpen, color: "text-[hsl(var(--gs-economy))]" },
                    { label: "Accuracy", value: `${coveragePercent}%`, icon: TrendingUp, color: "text-[hsl(var(--gs-science))]" },
                  ].map((stat) => (
                    <div key={stat.label} className="glass-card rounded-xl p-2.5 text-center">
                      <stat.icon className={`h-3.5 w-3.5 mx-auto mb-0.5 ${stat.color}`} />
                      <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Date Strip */}
      <DateStrip
        selectedDate={displayDateStr}
        onDateSelect={handleDateSelect}
        onCalendarOpen={() => setCalendarOpen(true)}
      />

      {/* Calendar Picker */}
      <DateCalendarPicker
        selectedDate={displayDate}
        onDateSelect={handleCalendarSelect}
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
      />

      {/* Quick Filter Chips — Additive Lozenges */}
      {articles.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 mb-2 -mx-1 px-1">
          {QUICK_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap",
                  "border transition-all duration-150 active:scale-95 shrink-0",
                  "min-h-[36px]", // 36px touch target
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                )}
              >
                {filter.label}
                {isActive && filter.key !== "all" && (
                  <span className="bg-primary-foreground/20 text-primary-foreground rounded-full h-5 min-w-[20px] px-1 text-xs flex items-center justify-center font-bold">
                    {filterCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Articles */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
              <div className="flex gap-2 mb-3">
                <div className="h-5 w-12 bg-muted rounded" />
                <div className="h-5 w-20 bg-muted rounded" />
              </div>
              <div className="h-6 w-3/4 bg-muted rounded mb-2" />
              <div className="h-4 w-full bg-muted rounded mb-1" />
              <div className="h-4 w-5/6 bg-muted rounded mb-4" />
              <div className="flex justify-end">
                <div className="h-8 w-8 bg-muted rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {isToday ? (
            <>
              <p className="text-sm">No articles processed yet today.</p>
              <p className="text-xs mt-1">Content pipeline is running — check back soon.</p>
            </>
          ) : (
            <>
              <p className="text-sm mb-1">
                No articles for{" "}
                {displayDate.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
              </p>
              <p className="text-xs mb-4">Try a nearby date</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => handleDateSelect(prevDateStr)}
                  className="flex items-center gap-1 text-xs font-medium text-accent hover:underline transition-all duration-150 active:scale-95"
                >
                  <ChevronLeft className="h-3 w-3" />
                  {format(subDays(displayDate, 1), "d MMM")}
                </button>
                {canGoNext && (
                  <button
                    onClick={() => handleDateSelect(nextDateStr)}
                    className="flex items-center gap-1 text-xs font-medium text-accent hover:underline transition-all duration-150 active:scale-95"
                  >
                    {format(nextDate, "d MMM")}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No articles match this filter.</p>
          <button
            onClick={() => setActiveFilter("all")}
            className="text-xs text-accent hover:underline mt-2 transition-all duration-150 active:scale-95"
          >
            Show all articles
          </button>
        </div>
      ) : (
        <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
          {["deep_analysis", "important_facts", "rapid_fire"].map((tier) => {
            const tierArticles = filteredArticles.filter((a) => a.depthTier === tier);
            if (tierArticles.length === 0) return null;

            const TIER_META = {
              deep_analysis: { label: "In Depth", color: "text-accent" },
              important_facts: { label: "Key Facts", color: "text-primary" },
              rapid_fire: { label: "Quick Bites", color: "text-muted-foreground" },
            }[tier as keyof typeof TIER_META];

            return (
              <section key={tier} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className={cn("text-sm font-bold uppercase tracking-wider", TIER_META.color)}>
                    {TIER_META.label}
                  </h2>
                  <div className="h-px bg-border flex-1" />
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {tierArticles.length}
                  </Badge>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {tierArticles.map((issue) => (
                    <motion.div key={issue.id} variants={item}>
                      <IssueCard {...issue} />
                    </motion.div>
                  ))}
                </div>
              </section>
            );
          })}
        </motion.div>
      )}

      {filteredArticles.length > 0 && (
        <motion.div
          className="mt-8 flex items-center justify-center gap-2 text-muted-foreground py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <CheckCircle className="h-5 w-5 text-gs-economy" />
          <span className="text-sm font-medium">
            {isToday ? "You're all caught up" : "End of this day's brief"}
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default Index;
