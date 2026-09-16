import webpush from "web-push";
import { AuthError, verifyFirebaseToken, type VerifiedUser } from "./auth";
import { getDocument, listDocuments, patchDocument } from "./firestoreClient";
import { getGoogleAccessToken } from "./googleAuth";
import { runDueDateReminders } from "./reminders";
import { isAllowedEmail, validateNotifyBody } from "./validation";

export interface Env {
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGIN: string;
  ALLOWED_EMAILS: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  FIREBASE_SERVICE_ACCOUNT_EMAIL: string;
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
}

type TokenVerifier = (
  authorizationHeader: string | null,
  projectId: string,
) => Promise<VerifiedUser>;

type PushSender = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
) => Promise<{ ok: boolean; statusCode?: number }>;

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

function jsonResponse(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function defaultPushSender(env: Env): PushSender {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  return async (subscription, payload) => {
    try {
      await webpush.sendNotification(subscription, payload);
      return { ok: true };
    } catch (err) {
      const statusCode =
        typeof err === "object" && err !== null && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : undefined;
      return { ok: false, statusCode };
    }
  };
}

export async function handleRequest(
  request: Request,
  env: Env,
  verifyToken: TokenVerifier = verifyFirebaseToken,
  sendPush: PushSender = defaultPushSender(env),
): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const url = new URL(request.url);
  if (request.method !== "POST" || url.pathname !== "/notify") {
    return jsonResponse({ error: "Route inconnue." }, 404, origin);
  }

  let user: VerifiedUser;
  try {
    user = await verifyToken(
      request.headers.get("Authorization"),
      env.FIREBASE_PROJECT_ID,
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonResponse({ error: err.message }, 401, origin);
    }
    throw err;
  }

  if (!isAllowedEmail(user.email, env.ALLOWED_EMAILS)) {
    return jsonResponse(
      { error: "Ce compte n'est pas autorisé à envoyer des notifications." },
      403,
      origin,
    );
  }

  const json = await request.json().catch(() => null);
  const validation = validateNotifyBody(json);
  if (!validation.valid) {
    return jsonResponse({ error: validation.error }, 400, origin);
  }

  const { subscriptions, title, body, url: targetUrl } = validation.body;
  const payload = JSON.stringify({ title, body, url: targetUrl ?? "/" });

  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      const result = await sendPush(subscription, payload);
      return { endpoint: subscription.endpoint, ...result };
    }),
  );

  return jsonResponse({ results }, 200, origin);
}

export async function handleScheduled(env: Env): Promise<void> {
  await runDueDateReminders(env, {
    getAccessToken: getGoogleAccessToken,
    listTasks: (projectId, accessToken) =>
      listDocuments(projectId, "tasks", accessToken),
    getUser: (projectId, uid, accessToken) =>
      getDocument(projectId, `users/${uid}`, accessToken),
    markReminded: (projectId, taskId, accessToken) =>
      patchDocument(
        projectId,
        `tasks/${taskId}`,
        { dueReminderSentAt: { integerValue: String(Date.now()) } },
        accessToken,
      ),
    // Construit paresseusement : évite d'appeler setVapidDetails() (qui
    // valide le format des clés) tant qu'aucune notification n'est à envoyer.
    sendPush: (subscription, payload) => defaultPushSender(env)(subscription, payload),
    now: () => new Date(),
  });
}

export default {
  fetch: (request: Request, env: Env) => handleRequest(request, env),
  scheduled: (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(handleScheduled(env));
  },
};
