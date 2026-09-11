import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { LoginPage } from "../pages/LoginPage";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, isAuthorized } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Chargement...
      </div>
    );
  }

  if (!isAuthorized) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
