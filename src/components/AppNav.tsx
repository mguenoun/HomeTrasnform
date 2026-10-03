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
    <header className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-2">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-[26px] w-[26px] shrink-0 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-red-500" />
          <span className="text-[15px] font-extrabold tracking-[-0.3px] text-[var(--ht-text)]">
            HomeTransform
          </span>
        </div>
        <nav className="ht-nav-pill">
          {LINKS.map((link) => {
            const active =
              link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? "page" : undefined}
                className={`ht-nav-link ${active ? "ht-nav-link-active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <NotificationsToggle />
        <ThemeToggle />
        {user?.displayName && (
          <span className="text-xs text-[var(--ht-text-2)]">
            {user.displayName}
          </span>
        )}
        <button type="button" onClick={signOutUser} className="ht-btn">
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
