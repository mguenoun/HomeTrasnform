import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { signInWithGoogle, error } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f7f5f1] px-4 dark:bg-[radial-gradient(circle_at_18%_-10%,#16243f_0%,#0c1628_45%,#020408_100%)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
        HomeTransform
      </h1>
      <p className="text-center text-slate-600 dark:text-slate-400">
        Organisez, planifiez et suivez les tâches et travaux de la maison en famille.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded bg-red-100 px-4 py-2 text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={signInWithGoogle}
        className="rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 px-4 py-2 font-medium text-slate-950 shadow-[0_8px_20px_-8px_rgba(239,68,68,0.5)] hover:brightness-105 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_10px_26px_-8px_rgba(239,68,68,0.55)]"
      >
        Se connecter avec Google
      </button>
    </div>
  );
}
