import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Newspaper, Target, BookOpen, MoreHorizontal, RotateCcw, Search, Bookmark, Flame, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { label: "Today", path: "/", icon: Newspaper },
  { label: "Practice", path: "/practice", icon: Target },
  { label: "Revise", path: "/revision", icon: RotateCcw },
  { label: "Syllabus", path: "/syllabus", icon: BookOpen },
];

const MORE_ITEMS = [
  { label: "Search", path: "/search", icon: Search },
  { label: "Saved", path: "/saved", icon: Bookmark },
  { label: "Dashboard", path: "/dashboard", icon: Flame },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur-xl">
      <div className="flex items-center justify-around px-1" style={{ height: "calc(3.5rem + env(safe-area-inset-bottom, 0px))", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors",
                "min-w-[3.5rem] min-h-[2.75rem] px-3 py-1.5",
                "active:scale-95 active:bg-muted/50",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-[22px] w-[22px]", isActive && "text-accent")} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className={cn("text-[10px] leading-tight", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
            </Link>
          );
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors",
                "min-w-[3.5rem] min-h-[2.75rem] px-3 py-1.5",
                "active:scale-95 active:bg-muted/50",
                "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={1.8} />
              <span className="text-[10px] leading-tight font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="text-left text-sm">More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-4 py-4">
              {MORE_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-foreground" strokeWidth={1.8} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
