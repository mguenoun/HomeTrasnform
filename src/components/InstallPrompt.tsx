import { useEffect, useState } from "react";
import { shouldShowIosInstallHint } from "../domain/pwaInstall";

const DISMISSED_KEY = "hometransform:install-hint-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    Boolean((navigator as { standalone?: boolean }).standalone) ||
    window.matchMedia?.("(display-mode: standalone)").matches
  );
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function persistDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // Stockage indisponible (navigation privée...) : la bannière réapparaîtra, sans conséquence grave.
  }
}

export function InstallPrompt() {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    persistDismissed();
    setDismissed(true);
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (dismissed) return null;

  if (deferredPrompt) {
    return (
      <div className="flex items-center justify-between gap-3 bg-blue-50 px-6 py-2 text-sm text-blue-900">
        <span>Installez HomeTransform sur cet appareil pour y accéder plus vite.</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleInstallClick}
            className="rounded bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700"
          >
            Installer
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Masquer"
            className="text-blue-700 hover:underline"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (
    shouldShowIosInstallHint({
      userAgent: navigator.userAgent,
      isStandalone: isStandalone(),
      dismissed,
    })
  ) {
    return (
      <div className="flex items-center justify-between gap-3 bg-blue-50 px-6 py-2 text-sm text-blue-900">
        <span>
          Pour installer HomeTransform : appuyez sur{" "}
          <strong>Partager</strong> puis « <strong>Sur l'écran d'accueil</strong> ».
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer"
          className="text-blue-700 hover:underline"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
