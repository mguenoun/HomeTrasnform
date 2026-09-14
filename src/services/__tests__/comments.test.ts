import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase/config", () => ({ db: {} }));

const addDocMock = vi.fn().mockResolvedValue({ id: "comment1" });
const onSnapshotMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...segments: string[]) => ({
    __collection: segments.join("/"),
  })),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  query: vi.fn((collectionRef) => collectionRef),
  orderBy: vi.fn((field) => ({ field })),
}));

const { addComment, subscribeToComments } = await import("../comments");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addComment", () => {
  it("écrit le commentaire avec l'auteur et l'horodatage", async () => {
    await addComment("task1", "Facture reçue", "user-1");

    const [collectionRef, payload] = addDocMock.mock.calls[0];
    expect(collectionRef.__collection).toBe("tasks/task1/comments");
    expect(payload).toMatchObject({
      taskId: "task1",
      authorId: "user-1",
      text: "Facture reçue",
    });
    expect(typeof payload.createdAt).toBe("number");
  });

  it("nettoie les espaces superflus", async () => {
    await addComment("task1", "  Bonjour  ", "user-1");
    const [, payload] = addDocMock.mock.calls[0];
    expect(payload.text).toBe("Bonjour");
  });

  it("refuse un commentaire vide sans appeler Firestore", async () => {
    await expect(addComment("task1", "   ", "user-1")).rejects.toThrow(
      /vide/,
    );
    expect(addDocMock).not.toHaveBeenCalled();
  });
});

describe("subscribeToComments", () => {
  it("transforme les documents en TaskComment[]", () => {
    const onChange = vi.fn();
    onSnapshotMock.mockImplementation((_query, callback) => {
      callback({
        docs: [
          {
            id: "comment1",
            data: () => ({ authorId: "user-1", text: "Bonjour" }),
          },
        ],
      });
      return () => {};
    });

    subscribeToComments("task1", onChange);

    expect(onChange).toHaveBeenCalledWith([
      { id: "comment1", authorId: "user-1", text: "Bonjour" },
    ]);
  });
});
