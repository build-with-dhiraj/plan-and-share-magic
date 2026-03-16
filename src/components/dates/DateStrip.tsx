import { useRef, useEffect } from "react";
import { format, subDays, isToday as isTodayFn, isSameDay } from "date-fns";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateStripProps {
  selectedDate: string; // "YYYY-MM-DD"
  onDateSelect: (date: string) => void;
  onCalendarOpen: () => void;
}

export function DateStrip({ selectedDate, onDateSelect, onCalendarOpen }: DateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Generate last 14 days (oldest → newest, so "Today" is at the right end)
  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => subDays(today, 13 - i));

  const selectedParsed = new Date(selectedDate + "T00:00:00");

  // Auto-scroll to selected date on mount / change
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedDate]);

  return (
    <div className="flex items-center gap-2 mb-4">
      {/* Calendar icon button */}
      <button
        onClick={onCalendarOpen}
        className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Open calendar"
      >
        <CalendarDays className="h-4 w-4" />
      </button>

      {/* Scrollable date pills */}
      <div
        ref={scrollRef}
        className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {dates.map((date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const isSelected = isSameDay(date, selectedParsed);
          const isToday = isTodayFn(date);

          return (
            <button
              key={dateStr}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onDateSelect(dateStr)}
              className={cn(
                "shrink-0 flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 min-w-[3.2rem] transition-all text-center",
                "scroll-snap-align-center",
                isSelected && isToday && "bg-primary text-primary-foreground shadow-sm",
                isSelected && !isToday && "bg-accent/15 border border-accent text-accent-foreground",
                !isSelected && "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              style={{ scrollSnapAlign: "center" }}
            >
              <span className="text-xs font-medium leading-tight">
                {isToday ? "Today" : format(date, "EEE")}
              </span>
              <span className={cn("text-sm font-semibold leading-tight", isToday && !isSelected && "text-foreground")}>
                {format(date, "d")}
              </span>
              {!isToday && (
                <span className="text-[10px] leading-tight opacity-70">
                  {format(date, "MMM")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
