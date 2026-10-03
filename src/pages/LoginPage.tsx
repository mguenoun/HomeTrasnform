import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { signInWithGoogle, error } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <h1 className="ht-h1 text-[28px]">
        HomeTransform
      </h1>
      <p className="text-center text-[var(--ht-text-2)]">
        Organisez, planifiez et suivez les tâches et travaux de la maison en famille.
      </p>
      {error && (
        <p
          role="alert"
          className="ht-pill ht-pill-over px-4 py-2 text-sm"
        >
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={signInWithGoogle}
        className="ht-btn-cta"
      >
        Se connecter avec Google
      </button>
    </div>
  );
}
