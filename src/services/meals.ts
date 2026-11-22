import {
  deleteField,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { stripUndefined } from "../firebase/sanitize";
import { DEFAULT_DINERS } from "../domain/mealPlan";
import type {
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
    onChange({
      weekId,
      items: data.items ?? {},
      vendorAmounts: data.vendorAmounts ?? {},
    });
  });
}

export interface NewShoppingItemInput {
  name: string;
  translation?: string;
  quantity?: string;
  vendor?: string;
}

/**
 * Nom de point de vente utilisable comme clé de map Firestore : espaces
 * normalisés, sans "/" ni "." (séparateurs de chemin), et jamais de la forme
 * réservée `__x__`.
 */
export function normalizeVendor(vendor: string | undefined): string {
  const cleaned = (vendor ?? "")
    .replace(/[/.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^__.*__$/.test(cleaned) ? cleaned.replace(/_/g, "") : cleaned;
}

export async function addShoppingItem(
  weekId: string,
  input: NewShoppingItemInput,
): Promise<string> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Le nom de l'article ne peut pas être vide.");
  }
  const createdAt = Date.now();
  const id = `${createdAt.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const item: ShoppingItem = stripUndefined({
    id,
    name,
    translation: input.translation?.trim() || undefined,
    quantity: input.quantity?.trim() || undefined,
    vendor: normalizeVendor(input.vendor) || undefined,
    checked: false,
    createdAt,
  }) as ShoppingItem;
  await setDoc(
    doc(db, SHOPPING_LISTS, weekId),
    { weekId, items: { [id]: item } },
    { merge: true },
  );
  return id;
}

/** Montant payé chez un point de vente ; `null` efface le montant. */
export async function setVendorAmount(
  weekId: string,
  vendor: string,
  amount: number | null,
): Promise<void> {
  const key = normalizeVendor(vendor);
  if (!key) {
    throw new Error("Choisissez d'abord un point de vente.");
  }
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
    throw new Error("Le montant doit être un nombre positif.");
  }
  await setDoc(
    doc(db, SHOPPING_LISTS, weekId),
    { weekId, vendorAmounts: { [key]: amount === null ? deleteField() : amount } },
    { merge: true },
  );
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
