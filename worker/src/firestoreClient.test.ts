import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDocument, listDocuments, patchDocument } from "./firestoreClient";

const PROJECT_ID = "test-project";
const TOKEN = "access-token";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listDocuments", () => {
  it("convertit les documents et suit la pagination", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            documents: [
              {
                name: "projects/p/databases/(default)/documents/tasks/task1",
                fields: { title: { stringValue: "Nettoyer" } },
              },
            ],
            nextPageToken: "page2",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            documents: [
              {
                name: "projects/p/databases/(default)/documents/tasks/task2",
                fields: { title: { stringValue: "Ranger" } },
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const docs = await listDocuments<{ title: string }>(
      PROJECT_ID,
      "tasks",
      TOKEN,
    );

    expect(docs).toEqual([
      { id: "task1", data: { title: "Nettoyer" } },
      { id: "task2", data: { title: "Ranger" } },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("pageToken=page2");
  });

  it("lève une erreur explicite si la requête échoue", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response("erreur", { status: 500 }));

    await expect(
      listDocuments(PROJECT_ID, "tasks", TOKEN),
    ).rejects.toThrow(/Lecture Firestore impossible/);
  });
});

describe("getDocument", () => {
  it("retourne le document converti quand il existe", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          name: "projects/p/databases/(default)/documents/users/user-1",
          fields: { displayName: { stringValue: "Marie" } },
        }),
        { status: 200 },
      ),
    );

    const doc = await getDocument<{ displayName: string }>(
      PROJECT_ID,
      "users/user-1",
      TOKEN,
    );

    expect(doc).toEqual({ id: "user-1", data: { displayName: "Marie" } });
  });

  it("retourne null si le document n'existe pas (404)", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response("not found", { status: 404 }));

    const doc = await getDocument(PROJECT_ID, "users/absent", TOKEN);

    expect(doc).toBeNull();
  });
});

describe("patchDocument", () => {
  it("envoie une requête PATCH avec un updateMask pour chaque champ modifié", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await patchDocument(
      PROJECT_ID,
      "tasks/task1",
      { dueReminderSentAt: { integerValue: "123" } },
      TOKEN,
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("updateMask.fieldPaths=dueReminderSentAt");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({
      fields: { dueReminderSentAt: { integerValue: "123" } },
    });
  });

  it("lève une erreur explicite si l'écriture échoue", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response("erreur", { status: 403 }));

    await expect(
      patchDocument(PROJECT_ID, "tasks/task1", {}, TOKEN),
    ).rejects.toThrow(/Écriture Firestore impossible/);
  });
});
