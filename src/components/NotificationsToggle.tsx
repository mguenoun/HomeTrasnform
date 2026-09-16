import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  isPushSubscribed,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "../services/push";

export function NotificationsToggle() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    isPushSubscribed()
      .then(setSubscribed)
      .catch(() => {});
  }, []);

  if (!supported || !user) return null;

  async function handleToggle() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      if (subscribed) {
        await unsubscribeFromPush(user);
        setSubscribed(false);
      } else {
        await subscribeToPush(user);
        setSubscribed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        aria-pressed={subscribed}
        className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-50"
      >
        {subscribed ? "Désactiver les notifications" : "Activer les notifications"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
