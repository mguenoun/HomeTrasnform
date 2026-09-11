import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { signInWithGoogle, error } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
      <h1 className="text-2xl font-semibold text-slate-900">HomeTransform</h1>
      <p className="text-slate-600">
        Organisez, planifiez et suivez les tâches et travaux de la maison en famille.
      </p>
      {error && (
        <p role="alert" className="rounded bg-red-100 px-4 py-2 text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={signInWithGoogle}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
      >
        Se connecter avec Google
      </button>
    </div>
  );
}
