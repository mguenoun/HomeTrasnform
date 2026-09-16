import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase/config", () => ({ db: {} }));

const addDocMock = vi.fn().mockResolvedValue({ id: "new-obj-id" });
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const getDocsMock = vi.fn();
const batchUpdateMock = vi.fn();
const batchDeleteMock = vi.fn();
const batchCommitMock = vi.fn().mockResolvedValue(undefined);

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  doc: vi.fn((_db, name, id) => ({ __doc: name, id })),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  deleteDoc: vi.fn(),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  query: vi.fn((collectionRef) => collectionRef),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  onSnapshot: vi.fn(),
  writeBatch: vi.fn(() => ({
    update: batchUpdateMock,
    delete: batchDeleteMock,
    commit: batchCommitMock,
  })),
}));

const {
  createObjective,
  updateObjective,
  setObjectiveStatus,
  deleteObjective,
} = await import("../objectives");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createObjective", () => {
  it("crée un objectif actif avec les champs par défaut", async () => {
    const id = await createObjective({
      title: "Réaménager le salon",
      createdBy: "user-1",
    });

    expect(id).toBe("new-obj-id");
    expect(addDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = addDocMock.mock.calls[0];
    expect(payload).toMatchObject({
      title: "Réaménager le salon",
      status: "active",
      createdBy: "user-1",
    });
    expect(typeof payload.createdAt).toBe("number");
  });
});

describe("updateObjective", () => {
  it("met à jour uniquement les champs fournis", async () => {
    await updateObjective("obj1", { title: "Nouveau titre" });
    expect(updateDocMock).toHaveBeenCalledWith(
      { __doc: "objectives", id: "obj1" },
      { title: "Nouveau titre" },
    );
  });

  it("retire les champs undefined avant l'écriture (Firestore les refuse et l'édition restait bloquée sans message)", async () => {
    await updateObjective("obj1", {
      title: "Réaménager le salon",
      targetDate: undefined,
    });
    expect(updateDocMock).toHaveBeenCalledWith(
      { __doc: "objectives", id: "obj1" },
      { title: "Réaménager le salon" },
    );
  });

  it("conserve la valeur null (utilisée pour effacer la date cible)", async () => {
    await updateObjective("obj1", { targetDate: null });
    expect(updateDocMock).toHaveBeenCalledWith(
      { __doc: "objectives", id: "obj1" },
      { targetDate: null },
    );
  });
});

describe("setObjectiveStatus", () => {
  it("archive un objectif", async () => {
    await setObjectiveStatus("obj1", "archived");
    expect(updateDocMock).toHaveBeenCalledWith(
      { __doc: "objectives", id: "obj1" },
      { status: "archived" },
    );
  });
});

describe("deleteObjective", () => {
  it("détache les tâches liées puis supprime l'objectif dans une transaction unique", async () => {
    getDocsMock.mockResolvedValue({
      docs: [{ ref: { __task: "task1" } }, { ref: { __task: "task2" } }],
    });

    await deleteObjective("obj1");

    expect(batchUpdateMock).toHaveBeenCalledTimes(2);
    expect(batchUpdateMock).toHaveBeenCalledWith(
      { __task: "task1" },
      { objectiveId: null },
    );
    expect(batchDeleteMock).toHaveBeenCalledWith({
      __doc: "objectives",
      id: "obj1",
    });
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });
});
