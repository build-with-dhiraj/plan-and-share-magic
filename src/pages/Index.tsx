import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { IssueCard } from "@/components/issues/IssueCard";
import { CheckCircle, Loader2, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, addDays, subDays, isToday as isTodayFn } from "date-fns";
import { DateStrip } from "@/components/dates/DateStrip";
import { DateCalendarPicker } from "@/components/dates/DateCalendarPicker";
import { useDateArticles, TIER_ORDER, TIER_LABELS } from "@/hooks/useDateArticles";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  // Group articles by tier
  const grouped = TIER_ORDER.reduce(
    (acc, tier) => {
      acc[tier] = articles.filter((a) => a.depthTier === tier);
      return acc;
    },
    {} as Record<string, typeof articles>,
  );

  const untied = articles.filter((a) => !a.depthTier);
  
  const hasTieredContent = TIER_ORDER.some((t) => grouped[t].length > 0);

  return (
    <div className="container max-w-3xl py-4 sm:py-6 px-4 pb-24 lg:pb-6">
      {/* Header */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {isToday ? "Today's Brief" : "Daily Brief"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
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
              className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Back to Today <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

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

      {/* Articles */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                  className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  <ChevronLeft className="h-3 w-3" />
                  {format(subDays(displayDate, 1), "d MMM")}
                </button>
                {canGoNext && (
                  <button
                    onClick={() => handleDateSelect(nextDateStr)}
                    className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                  >
                    {format(nextDate, "d MMM")}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : hasTieredContent ? (
        <>
          {TIER_ORDER.map((tier) => {
            const tierArticles = grouped[tier];
            if (tierArticles.length === 0) return null;
            return (
              <div key={tier} className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {TIER_LABELS[tier]}
                </h2>
                <motion.div className="space-y-3 sm:space-y-4" variants={container} initial="hidden" animate="show">
                  {tierArticles.map((issue) => (
                    <motion.div key={issue.id} variants={item}>
                      <IssueCard {...issue} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            );
          })}
          {untied.length > 0 && (
            <div className="mb-6">
              <motion.div className="space-y-3 sm:space-y-4" variants={container} initial="hidden" animate="show">
                {untied.map((issue) => (
                  <motion.div key={issue.id} variants={item}>
                    <IssueCard {...issue} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </>
      ) : (
        <motion.div className="space-y-3 sm:space-y-4" variants={container} initial="hidden" animate="show">
          {(untied.length > 0 ? untied : articles).map((issue) => (
            <motion.div key={issue.id} variants={item}>
              <IssueCard {...issue} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {articles.length > 0 && (
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
