import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase/config", () => ({ db: {} }));

const setDocMock = vi.fn().mockResolvedValue(undefined);
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const addDocMock = vi.fn().mockResolvedValue({ id: "exp1" });
const deleteDocMock = vi.fn().mockResolvedValue(undefined);
const batchMock = {
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
};
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
  writeBatch: () => batchMock,
  collection: vi.fn((_db, name: string) => ({ __collection: name })),
  query: vi.fn((ref, ...clauses) => ({ ...ref, clauses })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
}));

const {
  setDishTranslation,
  setIngredientTranslation,
  payVendorRound,
  updateShoppingItem,
  saveDish,
  deleteDish,
  rememberDishes,
  rememberIngredients,
  subscribeToDishes,
  subscribeToIngredients,
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

/** Écritures vers une collection donnée (les écritures d'apprentissage du
 *  référentiel, dishes/ingredients, s'ajoutent après l'écriture principale). */
const writesTo = (collectionName: string) =>
  setDocMock.mock.calls.filter(([ref]) =>
    (ref as { __doc: string }).__doc.startsWith(collectionName + "/"),
  );

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

    const [ref, payload, options] = writesTo("shoppingLists")[0];
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
    expect(writesTo("shoppingLists")[0][1].items[withVendor].vendor).toBe("Boucher");

    const noVendor = await addShoppingItem("2026-11-21", { name: "Sel" });
    expect("vendor" in writesTo("shoppingLists")[1][1].items[noVendor]).toBe(false);
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
    expect(writesTo("shoppingLists")).toHaveLength(1);
    const { items } = writesTo("shoppingLists")[0][1];
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
    expect(writesTo("mealPlans")).toHaveLength(1);
    const [ref, payload, options] = writesTo("mealPlans")[0];
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

describe("référentiel appris", () => {
  it("un snack saisi est mémorisé comme snack, un repas comme repas", async () => {
    await saveMealSlot("2026-11-21", "sat_snack", { items: [{ label: "Cheesecake" }] });
    await saveMealSlot("2026-11-21", "sat_lunch", { items: [{ label: "Couscous" }] });

    const dishes = writesTo("dishes");
    expect(dishes[0][0].__doc).toBe("dishes/cheesecake");
    expect(dishes[0][1]).toEqual({ name: "Cheesecake", asSnack: true });
    expect(dishes[1][1]).toEqual({ name: "Couscous", asMeal: true });
    expect(dishes[0][2]).toEqual({ merge: true });
  });

  it("dédoublonne par clé normalisée et cumule snack + repas pour un même plat", async () => {
    await rememberDishes([
      { label: "Soupe", snack: false },
      { label: "  soupe ", snack: true },
    ]);
    expect(writesTo("dishes")).toHaveLength(1);
    expect(writesTo("dishes")[0][1]).toMatchObject({ asSnack: true, asMeal: true });
  });

  it("l'import d'un programme mémorise chaque plat", async () => {
    await saveMealSlots("2026-11-21", {
      sat_snack: [{ label: "شينز كيك" }],
      sat_lunch: [{ label: "كسكسو" }, { label: "سلاض" }],
    });
    expect(writesTo("dishes").map(([ref]) => ref.__doc)).toEqual([
      "dishes/شينز كيك",
      "dishes/كسكسو",
      "dishes/سلاض",
    ]);
  });

  it("une panne du référentiel ne fait pas échouer la saisie du programme", async () => {
    setDocMock
      .mockResolvedValueOnce(undefined) // écriture principale
      .mockRejectedValueOnce(new Error("hors ligne")); // apprentissage
    await expect(
      saveMealSlot("2026-11-21", "sat_lunch", { items: [{ label: "Riz" }] }),
    ).resolves.toBeUndefined();
  });

  it("les articles ajoutés alimentent le catalogue avec point de vente et quantité", async () => {
    await addShoppingItems("2026-11-21", [
      { name: "Tomates", vendor: "Fruits et légumes", quantity: "2 kg" },
      { name: "Sel" },
    ]);
    const catalog = writesTo("ingredients");
    expect(catalog[0][0].__doc).toBe("ingredients/tomates");
    expect(catalog[0][1]).toEqual({
      name: "Tomates",
      vendor: "Fruits et légumes",
      quantity: "2 kg",
    });
    expect(catalog[1][1]).toEqual({ name: "Sel" });
  });

  it("rememberIngredients ignore les noms vides", async () => {
    await rememberIngredients([{ name: "  " }]);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("s'abonne aux plats et aux articles, triés par nom", () => {
    const dishes = vi.fn();
    const ingredients = vi.fn();
    onSnapshotMock.mockImplementation((_ref, callback) => {
      callback({
        docs: [
          { id: "b", data: () => ({ name: "Zaalouk" }) },
          { id: "a", data: () => ({ name: "Arroz" }) },
        ],
      });
      return () => {};
    });
    subscribeToDishes(dishes);
    subscribeToIngredients(ingredients);
    expect(dishes.mock.calls[0][0].map((d: { id: string }) => d.id)).toEqual(["a", "b"]);
    expect(ingredients.mock.calls[0][0].map((d: { id: string }) => d.id)).toEqual(["a", "b"]);
  });
});

describe("saveDish (ingrédients par plat)", () => {
  it("enregistre un plat avec ses variantes nettoyées et triées", async () => {
    const id = await saveDish(null, {
      name: "  شعرية الحليب ",
      translation: "Vermicelles au lait",
      basis: "persons",
      variants: [
        { n: 5, ingredients: [{ name: "شعرية", quantity: "2 باكية" }] },
        { n: 2, ingredients: [{ name: "  شعرية ", quantity: "1 باكية" }, { name: " " }] },
        { n: 3, ingredients: [{ name: "  " }] },
      ],
    });

    expect(id).toBe("شعرية الحليب");
    const [ref, payload, options] = writesTo("dishes")[0];
    expect(ref.__doc).toBe("dishes/شعرية الحليب");
    expect(options).toBeUndefined(); // remplacement complet, pas un merge
    expect(payload).toMatchObject({
      name: "شعرية الحليب",
      translation: "Vermicelles au lait",
      basis: "persons",
      asMeal: true,
      variants: [
        { n: 2, ingredients: [{ name: "شعرية", quantity: "1 باكية" }] },
        { n: 5, ingredients: [{ name: "شعرية", quantity: "2 باكية" }] },
      ],
    });
    expect("asSnack" in payload).toBe(false);
  });

  it("un snack garde son unité et est marqué snack", async () => {
    await saveDish(null, {
      name: "Pizza",
      basis: "units",
      unitLabel: " petite pizza ",
      variants: [{ n: 10, ingredients: [{ name: "Farine", quantity: "500 g" }] }],
    });
    const payload = writesTo("dishes")[0][1];
    expect(payload).toMatchObject({ basis: "units", unitLabel: "petite pizza", asSnack: true });
    expect("asMeal" in payload).toBe(false);
  });

  it("n'écrit pas d'unité pour un plat par personnes", async () => {
    await saveDish(null, {
      name: "Tajine",
      basis: "persons",
      unitLabel: "part",
      variants: [],
    });
    expect("unitLabel" in writesTo("dishes")[0][1]).toBe(false);
  });

  it("conserve les drapeaux d'usage déjà connus", async () => {
    await saveDish("soupe", {
      name: "Soupe",
      basis: "persons",
      asSnack: true,
      variants: [],
    });
    expect(writesTo("dishes")[0][1]).toMatchObject({ asSnack: true, asMeal: true });
  });

  it("renommer déplace le document : écrit sous la nouvelle clé, supprime l'ancienne", async () => {
    await saveDish("ancien nom", { name: "Nouveau nom", basis: "persons", variants: [] });
    expect(writesTo("dishes")[0][0].__doc).toBe("dishes/nouveau nom");
    expect(deleteDocMock.mock.calls[0][0].__doc).toBe("dishes/ancien nom");
  });

  it("ne supprime rien quand la clé ne change pas (simple correction de casse)", async () => {
    await saveDish("soupe", { name: "SOUPE", basis: "persons", variants: [] });
    expect(deleteDocMock).not.toHaveBeenCalled();
  });

  it("refuse un nom vide sans rien écrire", async () => {
    await expect(
      saveDish(null, { name: "  ", basis: "persons", variants: [] }),
    ).rejects.toThrow(/vide/);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("supprime un plat", async () => {
    await deleteDish("soupe");
    expect(deleteDocMock.mock.calls[0][0].__doc).toBe("dishes/soupe");
  });
});

describe("payVendorRound (paiement + report des articles non pris)", () => {
  const base = {
    vendor: "  Épicier ",
    round: 1,
    amount: 361,
    date: "2026-11-21",
    createdBy: "u1",
    leftoverItemIds: [] as string[],
  };

  it("écrit le paiement ET reporte les articles non pris au passage suivant, en un lot atomique", async () => {
    await payVendorRound("2026-11-21", { ...base, leftoverItemIds: ["lait", "yaourt"] });

    expect(batchMock.set).toHaveBeenCalledTimes(1);
    const payload = batchMock.set.mock.calls[0][1];
    expect(payload).toMatchObject({
      type: "groceries",
      amount: 361,
      vendor: "Épicier",
      weekId: "2026-11-21",
      date: "2026-11-21",
      createdBy: "u1",
    });
    expect("round" in payload).toBe(false); // passage 1 : champ omis

    const [listRef, updates] = batchMock.update.mock.calls[0];
    expect(listRef.__doc).toBe("shoppingLists/2026-11-21");
    expect(updates).toEqual({ "items.lait.round": 2, "items.yaourt.round": 2 });
    expect(batchMock.commit).toHaveBeenCalledTimes(1);
  });

  it("sans article restant, n'écrit que le paiement", async () => {
    await payVendorRound("2026-11-21", base);
    expect(batchMock.set).toHaveBeenCalledTimes(1);
    expect(batchMock.update).not.toHaveBeenCalled();
    expect(batchMock.commit).toHaveBeenCalledTimes(1);
  });

  it("paie le passage 2 et reporte vers le passage 3", async () => {
    await payVendorRound("2026-11-21", { ...base, round: 2, leftoverItemIds: ["x"] });
    expect(batchMock.set.mock.calls[0][1].round).toBe(2);
    expect(batchMock.update.mock.calls[0][1]).toEqual({ "items.x.round": 3 });
  });

  it("refuse montant invalide, date invalide ou point de vente vide, sans rien écrire", async () => {
    await expect(payVendorRound("w", { ...base, amount: 0 })).rejects.toThrow(/montant/);
    await expect(payVendorRound("w", { ...base, amount: NaN })).rejects.toThrow(/montant/);
    await expect(payVendorRound("w", { ...base, date: "21/11" })).rejects.toThrow(/date/);
    await expect(payVendorRound("w", { ...base, vendor: " " })).rejects.toThrow(/point de vente/);
    expect(batchMock.commit).not.toHaveBeenCalled();
  });

  it("ne reporte rien si le lot échoue (pas de demi-paiement)", async () => {
    batchMock.commit.mockRejectedValueOnce(new Error("réseau"));
    await expect(
      payVendorRound("2026-11-21", { ...base, leftoverItemIds: ["a"] }),
    ).rejects.toThrow("réseau");
  });
});

describe("passages à l'ajout", () => {
  it("mémorise le passage d'un article (seulement à partir de 2)", async () => {
    const [first, second] = await addShoppingItems("2026-11-21", [
      { name: "a", vendor: "Épicier", round: 1 },
      { name: "b", vendor: "Épicier", round: 2 },
    ]);
    const { items } = writesTo("shoppingLists")[0][1];
    expect("round" in items[first]).toBe(false);
    expect(items[second].round).toBe(2);
  });

  it("mémorise le passage d'un paiement de courses, jamais pour les honoraires", async () => {
    const base = { amount: 26, date: "2026-11-22", weekId: "2026-11-21", createdBy: "u1" };
    await addExpense({ ...base, type: "groceries", vendor: "Épicier", round: 2 });
    await addExpense({ ...base, type: "helper", round: 2 });
    expect(addDocMock.mock.calls[0][1].round).toBe(2);
    expect("round" in addDocMock.mock.calls[1][1]).toBe(false);
  });
});

describe("updateShoppingItem (correction d'un article)", () => {
  const previous = {
    id: "abc",
    name: "ancien",
    vendor: "Épicier",
    round: 2,
    checked: false,
    createdAt: 1,
  };

  it("modifie nom, traduction, quantité et point de vente par chemins de champ", async () => {
    await updateShoppingItem("2026-11-21", previous, {
      name: "  Tomates ",
      translation: " طماطم ",
      quantity: " 2 kg ",
      vendor: "Épicier",
    });
    expect(updateDocMock.mock.calls[0][1]).toEqual({
      "items.abc.name": "Tomates",
      // la traduction vit dans le catalogue : plus portée par l'article
      "items.abc.translation": "__DELETE__",
      "items.abc.quantity": "2 kg",
      "items.abc.vendor": "Épicier",
    });
    expect(writesTo("ingredients").at(-1)).toEqual([
      expect.objectContaining({ __doc: "ingredients/tomates" }),
      { name: "Tomates", translation: "طماطم" },
      { merge: true },
    ]);
  });

  it("supprime les champs vidés", async () => {
    await updateShoppingItem("2026-11-21", previous, {
      name: "x",
      translation: "",
      quantity: "  ",
      vendor: "Épicier",
    });
    const updates = updateDocMock.mock.calls[0][1];
    expect(updates["items.abc.translation"]).toBe("__DELETE__");
    expect(updates["items.abc.quantity"]).toBe("__DELETE__");
  });

  it("changer de point de vente remet l'article au premier passage", async () => {
    await updateShoppingItem("2026-11-21", previous, {
      name: "x",
      translation: "",
      quantity: "",
      vendor: "Boucher",
    });
    const updates = updateDocMock.mock.calls[0][1];
    expect(updates["items.abc.vendor"]).toBe("Boucher");
    expect(updates["items.abc.round"]).toBe("__DELETE__");
  });

  it("garde le passage quand le point de vente ne change pas", async () => {
    await updateShoppingItem("2026-11-21", previous, {
      name: "x",
      translation: "",
      quantity: "",
      vendor: "  Épicier ",
    });
    expect("items.abc.round" in updateDocMock.mock.calls[0][1]).toBe(false);
  });

  it("refuse un nom vide sans rien écrire", async () => {
    await expect(
      updateShoppingItem("2026-11-21", previous, {
        name: "  ",
        translation: "",
        quantity: "",
        vendor: "",
      }),
    ).rejects.toThrow(/vide/);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it("alimente le catalogue avec la correction", async () => {
    await updateShoppingItem("2026-11-21", previous, {
      name: "Tomates",
      translation: "",
      quantity: "2 kg",
      vendor: "Fruits et légumes",
    });
    expect(writesTo("ingredients")[0][1]).toEqual({
      name: "Tomates",
      vendor: "Fruits et légumes",
      quantity: "2 kg",
    });
  });
});

describe("traductions partagées (écrites une fois dans le référentiel)", () => {
  it("setDishTranslation enregistre la traduction sous la clé normalisée du plat", async () => {
    await setDishTranslation("  Cheesecake ", " Gâteau au fromage ");
    expect(setDocMock.mock.calls[0][0].__doc).toBe("dishes/cheesecake");
    expect(setDocMock.mock.calls[0][1]).toEqual({
      name: "Cheesecake",
      translation: "Gâteau au fromage",
    });
    expect(setDocMock.mock.calls[0][2]).toEqual({ merge: true });
  });

  it("une traduction vide l'efface du référentiel", async () => {
    await setDishTranslation("Cheesecake", "   ");
    expect(setDocMock.mock.calls[0][1].translation).toBe("__DELETE__");
  });

  it("setIngredientTranslation écrit dans le catalogue d'articles", async () => {
    await setIngredientTranslation("طماطم", "Tomates");
    expect(setDocMock.mock.calls[0][0].__doc).toBe("ingredients/طماطم");
    expect(setDocMock.mock.calls[0][1]).toEqual({ name: "طماطم", translation: "Tomates" });
  });

  it("ignore un nom vide", async () => {
    await setDishTranslation("  ", "x");
    await setIngredientTranslation("", "x");
    expect(setDocMock).not.toHaveBeenCalled();
  });
});

describe("saveMealSlot conserve le suivi de réalisation", () => {
  it("enregistre le statut et le motif des plats", async () => {
    await saveMealSlot("2026-11-21", "sat_lunch", {
      items: [
        { label: "Couscous", status: "prepared" },
        { label: "Tarte", status: "skipped", skipReason: "  Pas le temps " },
        { label: "Salade" },
      ],
    });
    expect(writesTo("mealPlans")[0][1].slots.sat_lunch.items).toEqual([
      { label: "Couscous", status: "prepared" },
      { label: "Tarte", status: "skipped", skipReason: "Pas le temps" },
      { label: "Salade" },
    ]);
  });

  it("ignore un statut invalide et un motif sur un plat qui n'est pas « non préparé »", async () => {
    await saveMealSlot("2026-11-21", "sat_lunch", {
      items: [
        { label: "A", status: "bizarre" as never },
        { label: "B", status: "prepared", skipReason: "Pas le temps" },
        { label: "C", status: "skipped", skipReason: "   " },
      ],
    });
    expect(writesTo("mealPlans")[0][1].slots.sat_lunch.items).toEqual([
      { label: "A" },
      { label: "B", status: "prepared" },
      { label: "C", status: "skipped" },
    ]);
  });
});
