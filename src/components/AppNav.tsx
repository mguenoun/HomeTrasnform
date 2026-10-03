import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationsToggle } from "./NotificationsToggle";
import { ThemeToggle } from "./ThemeToggle";

const LINKS: Array<{ to: string; label: string }> = [
  { to: "/", label: "Tableau de bord" },
  { to: "/objectives", label: "Objectifs" },
  { to: "/tasks", label: "Tâches" },
  { to: "/budget", label: "Budget" },
];

export function AppNav() {
  const { user, signOutUser } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3 dark:border-white/10 dark:bg-transparent dark:bg-gradient-to-b dark:from-[#0f1d33] dark:to-[#0c1628]">
      <div className="flex items-center gap-2.5">
        <div className="h-6 w-6 shrink-0 rounded-md bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 dark:shadow-[0_0_14px_-2px_rgba(249,115,22,0.6)]" />
        <nav className="flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1 dark:bg-white/5 dark:ring-1 dark:ring-white/10">
          {LINKS.map((link) => {
            const active =
              link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active
                    ? "bg-slate-900 text-white dark:bg-sky-500/20 dark:text-sky-300 dark:ring-1 dark:ring-sky-400/40"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <NotificationsToggle />
        <ThemeToggle />
        {user?.displayName && (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {user.displayName}
          </span>
        )}
        <button
          type="button"
          onClick={signOutUser}
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
