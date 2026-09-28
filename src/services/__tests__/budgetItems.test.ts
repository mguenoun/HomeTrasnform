import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase/config", () => ({ db: {} }));

const addDocMock = vi.fn().mockResolvedValue({ id: "new-item-id" });
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const deleteDocMock = vi.fn().mockResolvedValue(undefined);

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  doc: vi.fn((_db, name, id) => ({ __doc: name, id })),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  onSnapshot: vi.fn(),
}));

const { createBudgetItem, updateBudgetItem, deleteBudgetItem } = await import(
  "../budgetItems"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createBudgetItem", () => {
  it("crée une rubrique sans engagement ni paiement", async () => {
    const id = await createBudgetItem({
      title: "Carrelage salon",
      category: "materiaux",
      objectiveId: "obj1",
      taskId: null,
      budgeted: 1000,
      createdBy: "user-1",
    });

    expect(id).toBe("new-item-id");
    const [, payload] = addDocMock.mock.calls[0];
    expect(payload).toMatchObject({
      title: "Carrelage salon",
      category: "materiaux",
      objectiveId: "obj1",
      taskId: null,
      budgeted: 1000,
      revisedBudget: null,
      committed: null,
      remainingEstimate: null,
      forecastHistory: [],
      payments: [],
      createdBy: "user-1",
    });
  });
});

describe("updateBudgetItem", () => {
  it("met à jour les champs et horodate la modification", async () => {
    await updateBudgetItem("item1", { title: "Nouveau titre" });
    const [ref, payload] = updateDocMock.mock.calls[0];
    expect(ref).toEqual({ __doc: "budgetItems", id: "item1" });
    expect(payload.title).toBe("Nouveau titre");
    expect(typeof payload.updatedAt).toBe("number");
  });

  it("retire les champs undefined avant l'écriture", async () => {
    await updateBudgetItem("item1", {
      title: "Titre",
      committed: undefined,
    });
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload).not.toHaveProperty("committed");
  });

  it("conserve les valeurs null (utilisées pour effacer un champ)", async () => {
    await updateBudgetItem("item1", { committed: null });
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.committed).toBeNull();
  });

  it("peut remplacer la liste des paiements", async () => {
    const payments = [
      { id: "p1", date: "2026-03-01", amount: 100, status: "paye" as const, createdBy: "u1" },
    ];
    await updateBudgetItem("item1", { payments });
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.payments).toEqual(payments);
  });
});

describe("deleteBudgetItem", () => {
  it("supprime la rubrique", async () => {
    await deleteBudgetItem("item1");
    expect(deleteDocMock).toHaveBeenCalledWith({
      __doc: "budgetItems",
      id: "item1",
    });
  });
});
