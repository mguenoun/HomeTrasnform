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
      <p className="text-slate-600">
        Les objectifs, tâches et budgets apparaîtront ici.
      </p>
    </div>
  );
}
