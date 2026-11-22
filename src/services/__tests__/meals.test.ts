import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase/config", () => ({ db: {} }));

const setDocMock = vi.fn().mockResolvedValue(undefined);
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const onSnapshotMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, ...segments: string[]) => ({
    __doc: segments.join("/"),
  })),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  deleteField: vi.fn(() => "__DELETE__"),
}));

const {
  addShoppingItem,
  removeShoppingItem,
  saveDefaultDiners,
  normalizeVendor,
  saveMealSlot,
  setShoppingItemChecked,
  setVendorAmount,
  subscribeToMealPlan,
  subscribeToShoppingList,
} = await import("../meals");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveMealSlot", () => {
  it("écrit un seul créneau en merge, sans les libellés vides", async () => {
    await saveMealSlot("2026-W47", "mon_lunch", {
      diners: 6,
      items: [{ label: "  Tajine  " }, { label: "   " }],
    });

    const [ref, payload, options] = setDocMock.mock.calls[0];
    expect(ref.__doc).toBe("mealPlans/2026-W47");
    expect(options).toEqual({ merge: true });
    expect(payload).toEqual({
      weekId: "2026-W47",
      slots: { mon_lunch: { diners: 6, items: [{ label: "Tajine" }] } },
    });
  });

  it("n'écrit jamais de champ undefined (diners absent)", async () => {
    await saveMealSlot("2026-W47", "mon_lunch", { items: [{ label: "Riz" }] });
    const [, payload] = setDocMock.mock.calls[0];
    expect("diners" in payload.slots.mon_lunch).toBe(false);
  });
});

describe("saveDefaultDiners", () => {
  it("refuse un nombre invalide sans appeler Firestore", async () => {
    await expect(saveDefaultDiners("2026-W47", 0)).rejects.toThrow();
    await expect(saveDefaultDiners("2026-W47", 2.5)).rejects.toThrow();
    expect(setDocMock).not.toHaveBeenCalled();
  });
});

describe("liste de courses", () => {
  it("ajoute un article dans la map items", async () => {
    const id = await addShoppingItem("2026-W47", {
      name: " Tomates ",
      quantity: "2 kg",
    });

    const [ref, payload, options] = setDocMock.mock.calls[0];
    expect(ref.__doc).toBe("shoppingLists/2026-W47");
    expect(options).toEqual({ merge: true });
    expect(payload.items[id]).toMatchObject({
      id,
      name: "Tomates",
      quantity: "2 kg",
      checked: false,
    });
  });

  it("refuse un article sans nom", async () => {
    await expect(addShoppingItem("2026-W47", { name: "  " })).rejects.toThrow(
      /vide/,
    );
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("enregistre le point de vente normalisé, et l'omet s'il est vide", async () => {
    const withVendor = await addShoppingItem("2026-11-21", {
      name: "Poulet",
      vendor: "  Boucher  ",
    });
    expect(setDocMock.mock.calls[0][1].items[withVendor].vendor).toBe("Boucher");

    const noVendor = await addShoppingItem("2026-11-21", { name: "Sel" });
    expect("vendor" in setDocMock.mock.calls[1][1].items[noVendor]).toBe(false);
  });

  it("enregistre le montant payé chez un point de vente, ou l'efface", async () => {
    await setVendorAmount("2026-11-21", "Boucher", 300);
    expect(setDocMock.mock.calls[0][1]).toEqual({
      weekId: "2026-11-21",
      vendorAmounts: { Boucher: 300 },
    });

    await setVendorAmount("2026-11-21", "Boucher", null);
    expect(setDocMock.mock.calls[1][1].vendorAmounts.Boucher).toBe("__DELETE__");
  });

  it("refuse un montant invalide ou un point de vente vide", async () => {
    await expect(setVendorAmount("2026-11-21", "Boucher", -5)).rejects.toThrow();
    await expect(setVendorAmount("2026-11-21", "Boucher", NaN)).rejects.toThrow();
    await expect(setVendorAmount("2026-11-21", "  ", 10)).rejects.toThrow();
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("coche un article par chemin de champ, sans réécrire la liste", async () => {
    await setShoppingItemChecked("2026-W47", "abc", true);
    expect(updateDocMock.mock.calls[0][1]).toEqual({ "items.abc.checked": true });
  });

  it("supprime un article avec deleteField", async () => {
    await removeShoppingItem("2026-W47", "abc");
    expect(updateDocMock.mock.calls[0][1]).toEqual({ "items.abc": "__DELETE__" });
  });
});

describe("abonnements", () => {
  it("renvoie null quand la semaine n'a pas encore de programme", () => {
    const onChange = vi.fn();
    onSnapshotMock.mockImplementation((_ref, callback) => {
      callback({ exists: () => false });
      return () => {};
    });
    subscribeToMealPlan("2026-W47", onChange);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("complète les champs absents d'un programme existant", () => {
    const onChange = vi.fn();
    onSnapshotMock.mockImplementation((_ref, callback) => {
      callback({ exists: () => true, data: () => ({}) });
      return () => {};
    });
    subscribeToMealPlan("2026-W47", onChange);
    expect(onChange).toHaveBeenCalledWith({
      weekId: "2026-W47",
      defaultDiners: 4,
      slots: {},
    });
  });

  it("renvoie une liste vide quand le document n'existe pas", () => {
    const onChange = vi.fn();
    onSnapshotMock.mockImplementation((_ref, callback) => {
      callback({ exists: () => false });
      return () => {};
    });
    subscribeToShoppingList("2026-W47", onChange);
    expect(onChange).toHaveBeenCalledWith({
      weekId: "2026-W47",
      items: {},
      vendorAmounts: {},
    });
  });
});

describe("normalizeVendor", () => {
  it("retire les séparateurs de chemin Firestore et normalise les espaces", () => {
    expect(normalizeVendor("  Fruits   et légumes ")).toBe("Fruits et légumes");
    expect(normalizeVendor("a/b.c")).toBe("a b c");
    expect(normalizeVendor("__x__")).toBe("x");
    expect(normalizeVendor(undefined)).toBe("");
  });
});
