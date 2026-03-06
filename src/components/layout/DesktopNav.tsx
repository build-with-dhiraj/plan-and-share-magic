import { Link, useLocation } from "react-router-dom";
import { Search, User, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { label: "Today", path: "/" },
  { label: "Explore", path: "/syllabus" },
  { label: "Revise", path: "/revision" },
  { label: "Practice", path: "/practice" },
];

export function DesktopNav() {
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 hidden lg:block border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">U</span>
            </div>
            <span className="font-semibold text-lg text-foreground tracking-tight">UPSC Engine</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/search">
              <Search className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <Flame className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/settings">
              <User className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
