import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { LoginPage } from "../pages/LoginPage";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, isAuthorized } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 dark:bg-[radial-gradient(circle_at_18%_-10%,#16243f_0%,#0c1628_45%,#020408_100%)] dark:text-slate-400">
        Chargement...
      </div>
    );
  }

  if (!isAuthorized) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
