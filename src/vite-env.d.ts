/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_USE_FIREBASE_EMULATORS?: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_NOTIFICATIONS_WORKER_URL: string;
  /** E-mails (séparés par des virgules) autorisés à changer le statut préparé/non préparé. */
  readonly VITE_MEAL_STATUS_EDITORS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
