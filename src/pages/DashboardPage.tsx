import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { user, signOutUser } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          Tableau de bord
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-slate-600">{user?.displayName}</span>
          <button
            type="button"
            onClick={signOutUser}
            className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
          >
            Se déconnecter
          </button>
        </div>
      </header>
      <nav className="flex gap-3">
        <Link
          to="/objectives"
          className="rounded border border-slate-300 bg-white px-4 py-2 hover:bg-slate-100"
        >
          Objectifs
        </Link>
        <Link
          to="/tasks"
          className="rounded border border-slate-300 bg-white px-4 py-2 hover:bg-slate-100"
        >
          Tâches
        </Link>
      </nav>
    </div>
  );
}
