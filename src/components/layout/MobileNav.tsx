import { Link, useLocation } from "react-router-dom";
import { Newspaper, Compass, RotateCcw, Target, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Today", path: "/", icon: Newspaper },
  { label: "Explore", path: "/syllabus", icon: Compass },
  { label: "Practice", path: "/practice", icon: Target },
  { label: "Revise", path: "/revision", icon: RotateCcw },
  { label: "Profile", path: "/settings", icon: User },
];

export function MobileNav() {
  const location = useLocation();

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
      </div>
    </nav>
  );
}
