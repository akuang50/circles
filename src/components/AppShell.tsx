import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { CalendarHeart, CircleDot, UserRound } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { initials } from "./Status";

const tabs = [
  { to: "/circles", label: "Circles", icon: CircleDot, match: (path: string) => path.startsWith("/circles") || path.startsWith("/join") || path.startsWith("/new") },
  { to: "/events", label: "Events", icon: CalendarHeart, match: (path: string) => path.startsWith("/events") },
  { to: "/you", label: "You", icon: UserRound, match: (path: string) => path.startsWith("/you") },
];

export function AppShell() {
  const { user } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-svh bg-[radial-gradient(1200px_circle_at_10%_-10%,oklch(0.94_0.04_80),transparent_55%),radial-gradient(900px_circle_at_100%_0%,oklch(0.93_0.03_160),transparent_50%)]">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl">
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/70 px-4 py-6 backdrop-blur md:flex">
          <button
            type="button"
            onClick={() => navigate("/circles")}
            className="mb-8 flex items-center gap-2 px-2 text-left"
          >
            <Logo />
            <span className="font-serif text-2xl tracking-tight">Circles</span>
          </button>
          <nav className="flex flex-1 flex-col gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  tab.match(location.pathname)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </NavLink>
            ))}
          </nav>
          {user ? (
            <div className="mt-auto flex items-center gap-3 rounded-xl bg-secondary/70 px-3 py-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {initials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">In the room</p>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b bg-card/60 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-serif text-xl">Circles</span>
            </div>
            {user ? (
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {initials(user.name)}
              </div>
            ) : null}
          </header>
          <main className="flex-1 px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-8">
            <Outlet />
          </main>
          <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t bg-card/95 px-2 py-2 backdrop-blur md:hidden">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg py-1 text-xs",
                  tab.match(location.pathname)
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                <tab.icon className="size-5" />
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
      <circle cx="13" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-primary" />
      <circle cx="19" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-accent-foreground" />
    </svg>
  );
}
