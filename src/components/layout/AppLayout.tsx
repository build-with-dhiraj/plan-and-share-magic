import { Outlet, useLocation } from "react-router-dom";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";

const HIDE_NAV_ROUTES = ["/onboarding", "/auth"];

export function AppLayout() {
  const location = useLocation();
  const hideNav = HIDE_NAV_ROUTES.some((r) => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen bg-background">
      {!hideNav && <DesktopNav />}
      <main className={!hideNav ? "pb-20 md:pb-0 md:pt-16" : ""}>
        <Outlet />
      </main>
      {!hideNav && <MobileNav />}
    </div>
  );
}
