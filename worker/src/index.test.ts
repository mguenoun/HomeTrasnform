import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "./auth";
import { handleRequest, handleScheduled, type Env } from "./index";
import * as reminders from "./reminders";

const BASE_ENV: Env = {
  FIREBASE_PROJECT_ID: "test-project",
  ALLOWED_ORIGIN: "https://app.example.com",
  ALLOWED_EMAILS: "marie@example.com",
  VAPID_PUBLIC_KEY: "pub",
  VAPID_PRIVATE_KEY: "priv",
  VAPID_SUBJECT: "mailto:test@example.com",
  FIREBASE_SERVICE_ACCOUNT_EMAIL: "worker@test-project.iam.gserviceaccount.com",
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: "fake-key",
};

const verifyOk = vi
  .fn()
  .mockResolvedValue({ uid: "uid-1", email: "marie@example.com" });

const SUB = {
  endpoint: "https://push.example.com/abc",
  keys: { p256dh: "key1", auth: "key2" },
};

function request(body: unknown, method = "POST") {
  return new Request("https://worker/notify", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "OPTIONS" ? undefined : JSON.stringify(body),
  });
}

describe("handleRequest", () => {
  beforeEach(() => {
    verifyOk.mockClear();
  });

  it("répond aux requêtes OPTIONS sans vérifier l'authentification", async () => {
    const verify = vi.fn();
    const sendPush = vi.fn();
    const res = await handleRequest(
      request(undefined, "OPTIONS"),
      BASE_ENV,
      verify,
      sendPush,
    );
    expect(res.status).toBe(204);
    expect(verify).not.toHaveBeenCalled();
  });

  it("refuse une requête sans token valide (401)", async () => {
    const verify = vi.fn().mockRejectedValue(new AuthError("nope"));
    const sendPush = vi.fn();
    const res = await handleRequest(
      request({ subscriptions: [SUB], title: "t", body: "b" }),
      BASE_ENV,
      verify,
      sendPush,
    );
    expect(res.status).toBe(401);
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("refuse un email non autorisé (403)", async () => {
    const verify = vi.fn().mockResolvedValue({ uid: "x", email: "intrus@example.com" });
    const sendPush = vi.fn();
    const res = await handleRequest(
      request({ subscriptions: [SUB], title: "t", body: "b" }),
      BASE_ENV,
      verify,
      sendPush,
    );
    expect(res.status).toBe(403);
  });

  it("refuse un corps de requête invalide (400)", async () => {
    const sendPush = vi.fn();
    const res = await handleRequest(
      request({ subscriptions: [] }),
      BASE_ENV,
      verifyOk,
      sendPush,
    );
    expect(res.status).toBe(400);
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("envoie une notification à chaque abonnement et renvoie les résultats", async () => {
    const sendPush = vi.fn().mockResolvedValue({ ok: true });
    const res = await handleRequest(
      request({
        subscriptions: [SUB, { ...SUB, endpoint: "https://push.example.com/xyz" }],
        title: "Nouvelle tâche",
        body: "Repeindre le salon vous a été assignée.",
        url: "/tasks/task1",
      }),
      BASE_ENV,
      verifyOk,
      sendPush,
    );

    expect(res.status).toBe(200);
    expect(sendPush).toHaveBeenCalledTimes(2);
    const [subscriptionArg, payloadArg] = sendPush.mock.calls[0];
    expect(subscriptionArg).toEqual(SUB);
    expect(JSON.parse(payloadArg)).toMatchObject({
      title: "Nouvelle tâche",
      url: "/tasks/task1",
    });

    const json = (await res.json()) as { results: Array<{ ok: boolean }> };
    expect(json.results).toHaveLength(2);
    expect(json.results.every((r) => r.ok)).toBe(true);
  });

  it("continue d'envoyer aux autres abonnements même si l'un échoue", async () => {
    const sendPush = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, statusCode: 410 })
      .mockResolvedValueOnce({ ok: true });
    const res = await handleRequest(
      request({
        subscriptions: [SUB, { ...SUB, endpoint: "https://push.example.com/xyz" }],
        title: "t",
        body: "b",
      }),
      BASE_ENV,
      verifyOk,
      sendPush,
    );

    const json = (await res.json()) as {
      results: Array<{ ok: boolean; statusCode?: number }>;
    };
    expect(json.results[0]).toMatchObject({ ok: false, statusCode: 410 });
    expect(json.results[1]).toMatchObject({ ok: true });
  });

  it("renvoie 404 pour une route inconnue", async () => {
    const req = new Request("https://worker/autre-chose", { method: "POST" });
    const res = await handleRequest(req, BASE_ENV, verifyOk, vi.fn());
    expect(res.status).toBe(404);
  });
});

describe("handleScheduled", () => {
  it("délègue au job de rappels d'échéance avec l'environnement fourni", async () => {
    const spy = vi
      .spyOn(reminders, "runDueDateReminders")
      .mockResolvedValue({ tasksReminded: 2 });

    await handleScheduled(BASE_ENV);

    expect(spy).toHaveBeenCalledWith(BASE_ENV, expect.any(Object));
    spy.mockRestore();
  });
});
