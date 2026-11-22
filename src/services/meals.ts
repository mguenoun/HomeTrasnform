import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { stripUndefined } from "../firebase/sanitize";
import { catalogKey } from "../domain/catalog";
import { DEFAULT_DINERS } from "../domain/mealPlan";
import type {
  CatalogIngredient,
  Dish,
  ExpenseType,
  HouseholdExpense,
  MealItem,
  MealPlan,
  MealSlot,
  MealSlotKey,
  ShoppingItem,
  ShoppingList,
} from "../types";

const MEAL_PLANS = "mealPlans";
const SHOPPING_LISTS = "shoppingLists";

// ---------------------------------------------------------------------------
// Programme de la semaine : un document par semaine (id = weekId).
// ---------------------------------------------------------------------------

export function subscribeToMealPlan(
  weekId: string,
  onChange: (plan: MealPlan | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, MEAL_PLANS, weekId), (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }
    const data = snapshot.data() as Partial<MealPlan>;
    onChange({
      weekId,
      defaultDiners: data.defaultDiners ?? DEFAULT_DINERS,
      slots: data.slots ?? {},
    });
  });
}

/**
 * Remplace un seul créneau (merge) : deux personnes qui modifient deux
 * créneaux différents au même moment ne s'écrasent pas.
 */
export async function saveMealSlot(
  weekId: string,
  key: MealSlotKey,
  slot: MealSlot,
): Promise<void> {
  const cleanItems = slot.items
    .map((item) => ({
      label: item.label.trim(),
      ...(item.translation?.trim()
        ? { translation: item.translation.trim() }
        : {}),
    }))
    .filter((item) => item.label.length > 0);
  await setDoc(
    doc(db, MEAL_PLANS, weekId),
    {
      weekId,
      slots: {
        [key]: stripUndefined({ diners: slot.diners, items: cleanItems }),
      },
    },
    { merge: true },
  );
  await rememberDishes(cleanItems.map((item) => ({ label: item.label, snack: isSnackKey(key) })));
}

/**
 * Importe plusieurs créneaux d'un coup (programme collé). Les créneaux absents
 * de `slots` ne sont pas touchés ; ceux fournis remplacent l'existant.
 */
export async function saveMealSlots(
  weekId: string,
  slots: Record<MealSlotKey, MealItem[]>,
): Promise<void> {
  const entries = Object.entries(slots)
    .map(([key, items]) => [
      key,
      {
        items: items
          .map((item) => ({ label: item.label.trim() }))
          .filter((item) => item.label.length > 0),
      },
    ] as const)
    .filter(([, slot]) => slot.items.length > 0);
  if (entries.length === 0) return;
  await setDoc(
    doc(db, MEAL_PLANS, weekId),
    { weekId, slots: Object.fromEntries(entries) },
    { merge: true },
  );
  await rememberDishes(
    Object.entries(slots).flatMap(([key, items]) =>
      items.map((item) => ({ label: item.label, snack: isSnackKey(key) })),
    ),
  );
}

export async function saveDefaultDiners(
  weekId: string,
  defaultDiners: number,
): Promise<void> {
  if (!Number.isInteger(defaultDiners) || defaultDiners < 1) {
    throw new Error("Le nombre de convives doit être un entier positif.");
  }
  await setDoc(
    doc(db, MEAL_PLANS, weekId),
    { weekId, defaultDiners },
    { merge: true },
  );
}

// ---------------------------------------------------------------------------
// Liste de courses : un document par semaine, articles en map par id.
// ---------------------------------------------------------------------------

export function subscribeToShoppingList(
  weekId: string,
  onChange: (list: ShoppingList) => void,
): Unsubscribe {
  return onSnapshot(doc(db, SHOPPING_LISTS, weekId), (snapshot) => {
    const data = snapshot.exists()
      ? (snapshot.data() as Partial<ShoppingList>)
      : {};
    onChange({ weekId, items: data.items ?? {} });
  });
}

export interface NewShoppingItemInput {
  name: string;
  translation?: string;
  quantity?: string;
  vendor?: string;
  price?: number;
}

/** Espaces normalisés ; chaîne vide si absent. */
export function normalizeVendor(vendor: string | undefined): string {
  return (vendor ?? "").replace(/\s+/g, " ").trim();
}

function assertValidPrice(price: number | undefined | null): void {
  if (price != null && (!Number.isFinite(price) || price < 0)) {
    throw new Error("Le prix doit être un nombre positif.");
  }
}

function buildShoppingItem(
  input: NewShoppingItemInput,
  createdAt: number,
  index: number,
): ShoppingItem {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Le nom de l'article ne peut pas être vide.");
  }
  assertValidPrice(input.price);
  const id = `${createdAt.toString(36)}${index.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return stripUndefined({
    id,
    name,
    translation: input.translation?.trim() || undefined,
    quantity: input.quantity?.trim() || undefined,
    vendor: normalizeVendor(input.vendor) || undefined,
    price: input.price,
    checked: false,
    // L'index garde l'ordre de saisie quand plusieurs articles sont ajoutés
    // dans la même milliseconde (import d'une liste collée).
    createdAt: createdAt + index,
  }) as ShoppingItem;
}

export async function addShoppingItem(
  weekId: string,
  input: NewShoppingItemInput,
): Promise<string> {
  const [id] = await addShoppingItems(weekId, [input]);
  return id;
}

/** Ajoute plusieurs articles en une seule écriture (import d'une liste collée). */
export async function addShoppingItems(
  weekId: string,
  inputs: NewShoppingItemInput[],
): Promise<string[]> {
  const createdAt = Date.now();
  // Toutes les validations avant la moindre écriture : un article invalide
  // n'enregistre pas la moitié de la liste.
  const items = inputs.map((input, index) =>
    buildShoppingItem(input, createdAt, index),
  );
  if (items.length === 0) return [];
  await setDoc(
    doc(db, SHOPPING_LISTS, weekId),
    { weekId, items: Object.fromEntries(items.map((item) => [item.id, item])) },
    { merge: true },
  );
  await rememberIngredients(items);
  return items.map((item) => item.id);
}

/** Prix payé pour un article ; `null` l'efface. */
export async function setShoppingItemPrice(
  weekId: string,
  itemId: string,
  price: number | null,
): Promise<void> {
  assertValidPrice(price);
  await updateDoc(doc(db, SHOPPING_LISTS, weekId), {
    [`items.${itemId}.price`]: price === null ? deleteField() : price,
  });
}

/** Déplace un article vers un autre point de vente ; chaîne vide = non classé. */
export async function setShoppingItemVendor(
  weekId: string,
  itemId: string,
  vendor: string,
): Promise<void> {
  const normalized = normalizeVendor(vendor);
  await updateDoc(doc(db, SHOPPING_LISTS, weekId), {
    [`items.${itemId}.vendor`]: normalized ? normalized : deleteField(),
  });
}

export async function setShoppingItemChecked(
  weekId: string,
  itemId: string,
  checked: boolean,
): Promise<void> {
  await updateDoc(doc(db, SHOPPING_LISTS, weekId), {
    [`items.${itemId}.checked`]: checked,
  });
}

export async function removeShoppingItem(
  weekId: string,
  itemId: string,
): Promise<void> {
  await updateDoc(doc(db, SHOPPING_LISTS, weekId), {
    [`items.${itemId}`]: deleteField(),
  });
}

// ---------------------------------------------------------------------------
// Dépenses : un document par paiement, rattaché à une semaine.
// ---------------------------------------------------------------------------

const EXPENSES = "householdExpenses";

/** Tarif journalier habituel de la personne de ménage (MAD). */
export const HELPER_DAILY_RATE = 200;

export function subscribeToExpenses(
  weekId: string,
  onChange: (expenses: HouseholdExpense[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, EXPENSES), where("weekId", "==", weekId)),
    (snapshot) => {
      const expenses = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as HouseholdExpense)
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
      onChange(expenses);
    },
  );
}

export interface NewExpenseInput {
  type: ExpenseType;
  amount: number;
  /** "YYYY-MM-DD" */
  date: string;
  weekId: string;
  vendor?: string;
  note?: string;
  createdBy: string;
}

export async function addExpense(input: NewExpenseInput): Promise<void> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Le montant doit être un nombre positif.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("La date est invalide.");
  }
  if (input.type === "groceries" && !normalizeVendor(input.vendor)) {
    throw new Error("Indiquez le point de vente.");
  }
  await addDoc(
    collection(db, EXPENSES),
    stripUndefined({
      type: input.type,
      amount: input.amount,
      date: input.date,
      weekId: input.weekId,
      // Un paiement de la personne de ménage n'a pas de point de vente.
      vendor:
        input.type === "groceries" ? normalizeVendor(input.vendor) : undefined,
      note: input.note?.trim() || undefined,
      createdBy: input.createdBy,
      createdAt: Date.now(),
    }),
  );
}

export async function removeExpense(expenseId: string): Promise<void> {
  await deleteDoc(doc(db, EXPENSES, expenseId));
}

// ---------------------------------------------------------------------------
// Référentiel appris : plats/snacks et articles de courses déjà saisis.
// ---------------------------------------------------------------------------

const DISHES = "dishes";
const INGREDIENTS = "ingredients";

function isSnackKey(slot: MealSlotKey): boolean {
  return slot.endsWith("_snack");
}

/**
 * Apprentissage au fil des saisies, "au mieux" : le programme ou la liste sont
 * déjà enregistrés quand on arrive ici, une panne du référentiel (qui ne sert
 * qu'à l'autocomplétion) ne doit donc pas faire échouer la saisie.
 */
async function bestEffort(write: Promise<unknown>): Promise<void> {
  try {
    await write;
  } catch {
    /* référentiel non essentiel */
  }
}

export async function rememberDishes(
  entries: Array<{ label: string; snack: boolean }>,
): Promise<void> {
  const byKey = new Map<string, { name: string; asSnack?: true; asMeal?: true }>();
  for (const { label, snack } of entries) {
    const name = label.trim();
    const key = catalogKey(name);
    if (!key) continue;
    const entry = byKey.get(key) ?? { name };
    if (snack) entry.asSnack = true;
    else entry.asMeal = true;
    byKey.set(key, entry);
  }
  await bestEffort(
    Promise.all(
      [...byKey.entries()].map(([key, entry]) =>
        setDoc(doc(db, DISHES, key), entry, { merge: true }),
      ),
    ),
  );
}

export async function rememberIngredients(
  items: Array<{ name: string; vendor?: string; quantity?: string }>,
): Promise<void> {
  const byKey = new Map<string, Record<string, string>>();
  for (const item of items) {
    const key = catalogKey(item.name);
    if (!key) continue;
    byKey.set(key, {
      name: item.name.trim(),
      ...(item.vendor ? { vendor: item.vendor } : {}),
      ...(item.quantity ? { quantity: item.quantity } : {}),
    });
  }
  await bestEffort(
    Promise.all(
      [...byKey.entries()].map(([key, data]) =>
        setDoc(doc(db, INGREDIENTS, key), data, { merge: true }),
      ),
    ),
  );
}

export function subscribeToDishes(
  onChange: (dishes: Dish[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, DISHES), (snapshot) => {
    onChange(
      snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Dish)
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  });
}

export function subscribeToIngredients(
  onChange: (ingredients: CatalogIngredient[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, INGREDIENTS), (snapshot) => {
    onChange(
      snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as CatalogIngredient)
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  });
}
