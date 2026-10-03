import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { signInWithGoogle, error } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 dark:bg-[radial-gradient(circle_at_18%_-10%,#16243f_0%,#0c1628_45%,#020408_100%)]">
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
        className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 dark:bg-gradient-to-r dark:from-amber-400 dark:via-orange-500 dark:to-red-500 dark:text-slate-950 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_10px_26px_-8px_rgba(239,68,68,0.55)] dark:hover:brightness-105"
      >
        Se connecter avec Google
      </button>
    </div>
  );
}
