import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationsToggle } from "./NotificationsToggle";

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
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
      <nav className="flex flex-wrap gap-2">
        {LINKS.map((link) => {
          const active =
            link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              aria-current={active ? "page" : undefined}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                active
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3">
        <NotificationsToggle />
        {user?.displayName && (
          <span className="text-sm text-slate-600">{user.displayName}</span>
        )}
        <button
          type="button"
          onClick={signOutUser}
          className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
        >
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
