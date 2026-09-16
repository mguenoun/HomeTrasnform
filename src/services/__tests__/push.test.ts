import type { User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase/config", () => ({ db: {} }));

const updateDocMock = vi.fn().mockResolvedValue(undefined);
const arrayUnionMock = vi.fn((value: unknown) => ({ __arrayUnion: value }));
const arrayRemoveMock = vi.fn((value: unknown) => ({ __arrayRemove: value }));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, collection: string, id: string) => ({ __doc: collection, id })),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  arrayUnion: (value: unknown) => arrayUnionMock(value),
  arrayRemove: (value: unknown) => arrayRemoveMock(value),
}));

const {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  sendPushNotification,
} = await import("../push");

const fakeUser = { uid: "user-1", getIdToken: vi.fn().mockResolvedValue("id-token") } as unknown as User;

const SUBSCRIPTION_JSON = {
  endpoint: "https://push.example.com/abc",
  keys: { p256dh: "key1", auth: "key2" },
};

function makeFakeSubscription(overrides: Partial<typeof SUBSCRIPTION_JSON> = {}) {
  const json = { ...SUBSCRIPTION_JSON, ...overrides };
  return {
    toJSON: () => json,
    unsubscribe: vi.fn().mockResolvedValue(true),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (fakeUser.getIdToken as ReturnType<typeof vi.fn>).mockResolvedValue("id-token");
  vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "SGVsbG8");
  vi.stubEnv("VITE_NOTIFICATIONS_WORKER_URL", "https://worker.example.com");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("isPushSupported", () => {
  it("renvoie true quand serviceWorker et PushManager sont disponibles", () => {
    vi.stubGlobal("navigator", { serviceWorker: {} });
    vi.stubGlobal("window", { PushManager: {} });
    expect(isPushSupported()).toBe(true);
  });

  it("renvoie false si PushManager est absent (ex: Safari hors installation)", () => {
    vi.stubGlobal("navigator", { serviceWorker: {} });
    vi.stubGlobal("window", {});
    expect(isPushSupported()).toBe(false);
  });
});

describe("subscribeToPush", () => {
  it("enregistre le service worker, s'abonne et sauvegarde l'abonnement dans Firestore", async () => {
    const fakeSubscription = makeFakeSubscription();
    const subscribe = vi.fn().mockResolvedValue(fakeSubscription);
    const register = vi.fn().mockResolvedValue({
      pushManager: { subscribe },
    });

    vi.stubGlobal("navigator", {
      serviceWorker: { register, ready: Promise.resolve() },
    });
    vi.stubGlobal("window", { PushManager: {} });
    vi.stubGlobal("Notification", {
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });

    await subscribeToPush(fakeUser);

    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(updateDocMock).toHaveBeenCalledWith(
      { __doc: "users", id: "user-1" },
      { pushSubscriptions: { __arrayUnion: SUBSCRIPTION_JSON } },
    );
  });

  it("échoue clairement si la permission est refusée", async () => {
    vi.stubGlobal("navigator", { serviceWorker: {} });
    vi.stubGlobal("window", { PushManager: {} });
    vi.stubGlobal("Notification", {
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });

    await expect(subscribeToPush(fakeUser)).rejects.toThrow(/refusée/);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it("échoue clairement si les notifications ne sont pas supportées", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", {});

    await expect(subscribeToPush(fakeUser)).rejects.toThrow(/pas prises en charge/);
  });
});

describe("unsubscribeFromPush", () => {
  it("désabonne et retire l'entrée de Firestore", async () => {
    const fakeSubscription = makeFakeSubscription();
    const getSubscription = vi.fn().mockResolvedValue(fakeSubscription);
    const getRegistration = vi.fn().mockResolvedValue({
      pushManager: { getSubscription },
    });

    vi.stubGlobal("navigator", { serviceWorker: { getRegistration } });
    vi.stubGlobal("window", { PushManager: {} });

    await unsubscribeFromPush(fakeUser);

    expect(fakeSubscription.unsubscribe).toHaveBeenCalled();
    expect(updateDocMock).toHaveBeenCalledWith(
      { __doc: "users", id: "user-1" },
      { pushSubscriptions: { __arrayRemove: SUBSCRIPTION_JSON } },
    );
  });

  it("ne fait rien s'il n'y a pas d'abonnement actif", async () => {
    const getRegistration = vi.fn().mockResolvedValue({
      pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
    });
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration } });
    vi.stubGlobal("window", { PushManager: {} });

    await unsubscribeFromPush(fakeUser);

    expect(updateDocMock).not.toHaveBeenCalled();
  });
});

describe("isPushSubscribed", () => {
  it("renvoie true s'il existe un abonnement actif", async () => {
    const getRegistration = vi.fn().mockResolvedValue({
      pushManager: { getSubscription: vi.fn().mockResolvedValue(makeFakeSubscription()) },
    });
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration } });
    vi.stubGlobal("window", { PushManager: {} });

    expect(await isPushSubscribed()).toBe(true);
  });

  it("renvoie false si les notifications ne sont pas supportées", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", {});
    expect(await isPushSubscribed()).toBe(false);
  });
});

describe("sendPushNotification", () => {
  it("appelle le Worker avec le token et le contenu de la notification", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendPushNotification(
      [SUBSCRIPTION_JSON],
      { title: "Nouvelle tâche", body: "Assignée !", url: "/tasks/task1" },
      fakeUser,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/notify"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer id-token" }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      subscriptions: [SUBSCRIPTION_JSON],
      title: "Nouvelle tâche",
      url: "/tasks/task1",
    });
  });

  it("n'appelle pas le Worker s'il n'y a aucun abonnement", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendPushNotification([], { title: "t", body: "b" }, fakeUser);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
