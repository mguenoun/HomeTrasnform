import type { User } from "firebase/auth";
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { base64UrlToUint8Array } from "../domain/push";
import { db } from "../firebase/config";
import type { PushSubscriptionRecord } from "../types";

function workerUrl(): string {
  return import.meta.env.VITE_NOTIFICATIONS_WORKER_URL;
}

export function isPushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window
  );
}

function toRecord(subscription: PushSubscription): PushSubscriptionRecord {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Abonnement push incomplet.");
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

export async function subscribeToPush(user: User): Promise<void> {
  if (!isPushSupported()) {
    throw new Error(
      "Les notifications ne sont pas prises en charge sur cet appareil/navigateur.",
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Autorisation refusée pour les notifications.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(
      import.meta.env.VITE_VAPID_PUBLIC_KEY,
    ) as BufferSource,
  });

  await updateDoc(doc(db, "users", user.uid), {
    pushSubscriptions: arrayUnion(toRecord(subscription)),
  });
}

export async function unsubscribeFromPush(user: User): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const record = toRecord(subscription);
  await subscription.unsubscribe();

  await updateDoc(doc(db, "users", user.uid), {
    pushSubscriptions: arrayRemove(record),
  });
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  return Boolean(subscription);
}

export async function sendPushNotification(
  subscriptions: PushSubscriptionRecord[],
  payload: { title: string; body: string; url?: string },
  user: User,
): Promise<void> {
  if (subscriptions.length === 0) return;

  const idToken = await user.getIdToken();
  await fetch(`${workerUrl()}/notify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subscriptions, ...payload }),
  });
}
