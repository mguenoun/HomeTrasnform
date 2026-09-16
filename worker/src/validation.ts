export function isAllowedEmail(
  email: string,
  allowedEmailsCsv: string,
): boolean {
  const allowed = allowedEmailsCsv
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface NotifyRequestBody {
  subscriptions: PushSubscriptionPayload[];
  title: string;
  body: string;
  url?: string;
}

export function validateNotifyBody(
  data: unknown,
): { valid: true; body: NotifyRequestBody } | { valid: false; error: string } {
  if (typeof data !== "object" || data === null) {
    return { valid: false, error: "Corps de requête invalide." };
  }
  const candidate = data as Record<string, unknown>;

  if (!Array.isArray(candidate.subscriptions) || candidate.subscriptions.length === 0) {
    return { valid: false, error: "Aucun abonnement fourni." };
  }
  for (const sub of candidate.subscriptions) {
    if (
      typeof sub !== "object" ||
      sub === null ||
      typeof (sub as PushSubscriptionPayload).endpoint !== "string" ||
      typeof (sub as PushSubscriptionPayload).keys?.p256dh !== "string" ||
      typeof (sub as PushSubscriptionPayload).keys?.auth !== "string"
    ) {
      return { valid: false, error: "Abonnement push invalide." };
    }
  }
  if (typeof candidate.title !== "string" || !candidate.title.trim()) {
    return { valid: false, error: "Titre manquant." };
  }
  if (typeof candidate.body !== "string" || !candidate.body.trim()) {
    return { valid: false, error: "Message manquant." };
  }
  if (candidate.url !== undefined && typeof candidate.url !== "string") {
    return { valid: false, error: "URL invalide." };
  }

  return {
    valid: true,
    body: {
      subscriptions: candidate.subscriptions as PushSubscriptionPayload[],
      title: candidate.title,
      body: candidate.body,
      url: candidate.url as string | undefined,
    },
  };
}
