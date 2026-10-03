import { Link, useLocation } from "react-router-dom";
import { initialsOf } from "../domain/initials";
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
    <header className="flex flex-col gap-3 px-4 pt-4 pb-1 md:px-6 md:pt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-[26px] w-[26px] shrink-0 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 dark:shadow-[0_0_14px_-2px_rgba(249,115,22,0.6)]" />
          <span className="text-[15px] font-extrabold tracking-[-0.3px] text-[var(--ht-text)]">
            HomeTransform
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <NotificationsToggle />
          <ThemeToggle />
          {user && (
            <span
              title={user.displayName ?? undefined}
              aria-label={user.displayName ?? undefined}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-[11px] font-extrabold text-slate-950"
            >
              {initialsOf(user.displayName)}
            </span>
          )}
          <button
            type="button"
            onClick={signOutUser}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="ht-btn flex h-8 w-8 items-center justify-center p-0"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
      <nav className="ht-nav-pill w-full">
        {LINKS.map((link) => {
          const active =
            link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              aria-current={active ? "page" : undefined}
              className={`ht-nav-link flex-1 text-center ${active ? "ht-nav-link-active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
