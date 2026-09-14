import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase/config", () => ({ db: {} }));

const setDocMock = vi.fn().mockResolvedValue(undefined);
const onSnapshotMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  doc: vi.fn((_db, name, id) => ({ __doc: name, id })),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
}));

const { subscribeToUsers, upsertUserProfile } = await import("../users");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("upsertUserProfile", () => {
  it("écrit le profil dans users/{uid} en fusionnant les champs", async () => {
    await upsertUserProfile({
      uid: "user-1",
      displayName: "Marie",
      email: "marie@example.com",
    });

    expect(setDocMock).toHaveBeenCalledWith(
      { __doc: "users", id: "user-1" },
      { uid: "user-1", displayName: "Marie", email: "marie@example.com" },
      { merge: true },
    );
  });
});

describe("subscribeToUsers", () => {
  it("transforme les documents de la collection users en FamilyUser[]", () => {
    const onChange = vi.fn();
    onSnapshotMock.mockImplementation((_collectionRef, callback) => {
      callback({
        docs: [
          {
            id: "user-1",
            data: () => ({ displayName: "Marie", email: "marie@example.com" }),
          },
        ],
      });
      return () => {};
    });

    subscribeToUsers(onChange);

    expect(onChange).toHaveBeenCalledWith([
      { uid: "user-1", displayName: "Marie", email: "marie@example.com" },
    ]);
  });
});
