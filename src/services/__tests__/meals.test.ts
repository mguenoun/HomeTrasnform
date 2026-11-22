import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase/config", () => ({ db: {} }));

const setDocMock = vi.fn().mockResolvedValue(undefined);
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const addDocMock = vi.fn().mockResolvedValue({ id: "exp1" });
const deleteDocMock = vi.fn().mockResolvedValue(undefined);
const onSnapshotMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, ...segments: string[]) => ({
    __doc: segments.join("/"),
  })),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  deleteField: vi.fn(() => "__DELETE__"),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  collection: vi.fn((_db, name: string) => ({ __collection: name })),
  query: vi.fn((ref, ...clauses) => ({ ...ref, clauses })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
}));

const {
  addExpense,
  addShoppingItem,
  addShoppingItems,
  removeExpense,
  removeShoppingItem,
  saveDefaultDiners,
  normalizeVendor,
  saveMealSlot,
  saveMealSlots,
  setShoppingItemChecked,
  setShoppingItemPrice,
  setShoppingItemVendor,
  subscribeToExpenses,
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

  it("enregistre le prix d'un article, ou l'efface", async () => {
    await setShoppingItemPrice("2026-11-21", "abc", 12.5);
    expect(updateDocMock.mock.calls[0][1]).toEqual({ "items.abc.price": 12.5 });
    await setShoppingItemPrice("2026-11-21", "abc", null);
    expect(updateDocMock.mock.calls[1][1]).toEqual({ "items.abc.price": "__DELETE__" });
  });

  it("refuse un prix négatif ou non numérique", async () => {
    await expect(setShoppingItemPrice("2026-11-21", "abc", -1)).rejects.toThrow();
    await expect(setShoppingItemPrice("2026-11-21", "abc", NaN)).rejects.toThrow();
    await expect(
      addShoppingItem("2026-11-21", { name: "x", price: -3 }),
    ).rejects.toThrow();
    expect(updateDocMock).not.toHaveBeenCalled();
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("déplace un article vers un autre point de vente, ou le déclasse", async () => {
    await setShoppingItemVendor("2026-11-21", "abc", "  Boucher ");
    expect(updateDocMock.mock.calls[0][1]).toEqual({ "items.abc.vendor": "Boucher" });
    await setShoppingItemVendor("2026-11-21", "abc", "");
    expect(updateDocMock.mock.calls[1][1]).toEqual({ "items.abc.vendor": "__DELETE__" });
  });

  it("importe plusieurs articles en UNE écriture, dans l'ordre", async () => {
    const ids = await addShoppingItems("2026-11-21", [
      { name: "A", vendor: "Boucher" },
      { name: "B", quantity: "2 kg" },
      { name: "C" },
    ]);
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const { items } = setDocMock.mock.calls[0][1];
    expect(Object.keys(items)).toEqual(ids);
    const order = ids.map((id) => items[id].createdAt);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("n'écrit rien si un article de l'import est invalide", async () => {
    await expect(
      addShoppingItems("2026-11-21", [{ name: "A" }, { name: "  " }]),
    ).rejects.toThrow(/vide/);
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
    expect(onChange).toHaveBeenCalledWith({ weekId: "2026-W47", items: {} });
  });
});

describe("normalizeVendor", () => {
  it("normalise les espaces et gère l'absence", () => {
    expect(normalizeVendor("  Fruits   et légumes ")).toBe("Fruits et légumes");
    expect(normalizeVendor(undefined)).toBe("");
  });
});

describe("saveMealSlots (import du programme)", () => {
  it("écrit tous les créneaux en une seule écriture merge", async () => {
    await saveMealSlots("2026-11-21", {
      sat_lunch: [{ label: " كسكسو " }, { label: "سلاض" }],
      sun_dinner: [{ label: "باط" }],
      mon_lunch: [{ label: "  " }],
    });
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [ref, payload, options] = setDocMock.mock.calls[0];
    expect(ref.__doc).toBe("mealPlans/2026-11-21");
    expect(options).toEqual({ merge: true });
    expect(payload.slots).toEqual({
      sat_lunch: { items: [{ label: "كسكسو" }, { label: "سلاض" }] },
      sun_dinner: { items: [{ label: "باط" }] },
    });
  });

  it("n'écrit rien quand il n'y a aucun créneau", async () => {
    await saveMealSlots("2026-11-21", {});
    expect(setDocMock).not.toHaveBeenCalled();
  });
});

describe("dépenses", () => {
  it("enregistre un paiement de courses avec son point de vente et sa date", async () => {
    await addExpense({
      type: "groceries",
      amount: 26,
      date: "2026-11-22",
      weekId: "2026-11-21",
      vendor: "  Épicier ",
      note: "lait et yaourt",
      createdBy: "u1",
    });
    const [ref, payload] = addDocMock.mock.calls[0];
    expect(ref.__collection).toBe("householdExpenses");
    expect(payload).toMatchObject({
      type: "groceries",
      amount: 26,
      date: "2026-11-22",
      weekId: "2026-11-21",
      vendor: "Épicier",
      note: "lait et yaourt",
      createdBy: "u1",
    });
  });

  it("un paiement de la femme de ménage n'a pas de point de vente", async () => {
    await addExpense({
      type: "helper",
      amount: 200,
      date: "2026-11-21",
      weekId: "2026-11-21",
      vendor: "Épicier",
      createdBy: "u1",
    });
    expect("vendor" in addDocMock.mock.calls[0][1]).toBe(false);
  });

  it("refuse montant nul/négatif, date invalide, courses sans point de vente", async () => {
    const base = {
      type: "groceries" as const,
      amount: 10,
      date: "2026-11-21",
      weekId: "2026-11-21",
      vendor: "Boucher",
      createdBy: "u1",
    };
    await expect(addExpense({ ...base, amount: 0 })).rejects.toThrow();
    await expect(addExpense({ ...base, amount: -5 })).rejects.toThrow();
    await expect(addExpense({ ...base, amount: NaN })).rejects.toThrow();
    await expect(addExpense({ ...base, date: "21/11/2026" })).rejects.toThrow();
    await expect(addExpense({ ...base, vendor: " " })).rejects.toThrow(/point de vente/);
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it("supprime un paiement", async () => {
    await removeExpense("exp1");
    expect(deleteDocMock.mock.calls[0][0].__doc).toBe("householdExpenses/exp1");
  });

  it("s'abonne aux paiements d'une semaine, triés par date", () => {
    const onChange = vi.fn();
    onSnapshotMock.mockImplementation((_query, callback) => {
      callback({
        docs: [
          { id: "b", data: () => ({ date: "2026-11-22", createdAt: 2, amount: 26 }) },
          { id: "a", data: () => ({ date: "2026-11-21", createdAt: 1, amount: 361 }) },
        ],
      });
      return () => {};
    });
    subscribeToExpenses("2026-11-21", onChange);
    expect(onChange.mock.calls[0][0].map((e: { id: string }) => e.id)).toEqual(["a", "b"]);
  });
});
