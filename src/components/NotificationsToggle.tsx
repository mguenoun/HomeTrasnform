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

  const label = subscribed
    ? "Désactiver les notifications"
    : "Activer les notifications";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        aria-pressed={subscribed}
        aria-label={label}
        title={label}
        className="ht-btn flex h-8 w-8 items-center justify-center p-0 disabled:opacity-50"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          {!subscribed && <path d="M2 2l20 20" />}
        </svg>
      </button>
      {error && <span className="text-xs text-[var(--ht-danger)]">{error}</span>}
    </div>
  );
}
