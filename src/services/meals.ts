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
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { stripUndefined } from "../firebase/sanitize";
import { catalogKey } from "../domain/catalog";
import { sanitizeVariants } from "../domain/dishes";
import { DEFAULT_DINERS } from "../domain/mealPlan";
import type {
  CatalogIngredient,
  PantryItem,
  Dish,
  DishVariant,
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
 * Toutes les semaines (un document chacune, une cinquantaine par an) : sert aux
 * statistiques par plat de la bibliothèque (servi N fois, 👍/👎).
 */
export function subscribeToAllMealPlans(
  onChange: (plans: MealPlan[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, MEAL_PLANS), (snapshot) => {
    onChange(
      snapshot.docs.map((d) => {
        const data = d.data() as Partial<MealPlan>;
        return {
          weekId: d.id,
          defaultDiners: data.defaultDiners ?? DEFAULT_DINERS,
          slots: data.slots ?? {},
        };
      }),
    );
  });
}

/**
 * Remplace un seul créneau (merge) : deux personnes qui modifient deux
 * créneaux différents au même moment ne s'écrasent pas.
 */
/** Votes valides (👍/👎 d'une personne identifiée) ; `undefined` s'il n'y en a aucun. */
function cleanVotes(
  votes: MealItem["votes"],
): Record<string, "up" | "down"> | undefined {
  const entries = Object.entries(votes ?? {}).filter(
    ([uid, vote]) => uid && (vote === "up" || vote === "down"),
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

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
      ...(item.status === "prepared" || item.status === "skipped"
        ? { status: item.status }
        : {}),
      ...(item.status === "skipped" && item.skipReason?.trim()
        ? { skipReason: item.skipReason.trim() }
        : {}),
      // Un retour n'existe que sur un plat préparé ; sa remarque que s'il y a un retour.
      ...(item.status === "prepared" &&
      (item.feedback === "up" || item.feedback === "down")
        ? { feedback: item.feedback }
        : {}),
      ...(item.status === "prepared" && cleanVotes(item.votes)
        ? { votes: cleanVotes(item.votes) }
        : {}),
      ...(item.status === "prepared" &&
      (item.feedback === "up" || item.feedback === "down" || cleanVotes(item.votes)) &&
      item.feedbackNote?.trim()
        ? { feedbackNote: item.feedbackNote.trim() }
        : {}),
      ...(Number.isInteger(item.n) && (item.n as number) > 0
        ? { n: item.n }
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
  /** Passage chez ce point de vente ; absent ou 1 = premier. */
  round?: number;
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
    round: input.round && input.round > 1 ? input.round : undefined,
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
  /** Passage chez ce point de vente ; absent ou 1 = premier. */
  round?: number;
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
      round:
        input.type === "groceries" && input.round && input.round > 1
          ? input.round
          : undefined,
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

/**
 * Enregistre (ou efface, si vide) la traduction d'un plat dans le référentiel :
 * elle vaut alors pour toutes les occurrences de ce nom (programme, autres
 * semaines, bibliothèque).
 */
export async function setDishTranslation(
  label: string,
  translation: string,
): Promise<void> {
  const key = catalogKey(label);
  if (!key) return;
  const text = translation.trim();
  await setDoc(
    doc(db, DISHES, key),
    { name: label.trim(), translation: text ? text : deleteField() },
    { merge: true },
  );
}

/** Idem pour un article de courses (catalogue `ingredients`). */
export async function setIngredientTranslation(
  name: string,
  translation: string,
): Promise<void> {
  const key = catalogKey(name);
  if (!key) return;
  const text = translation.trim();
  await setDoc(
    doc(db, INGREDIENTS, key),
    { name: name.trim(), translation: text ? text : deleteField() },
    { merge: true },
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

export interface DishInput {
  name: string;
  translation?: string;
  basis: "persons" | "units";
  unitLabel?: string;
  variants: DishVariant[];
  /** Drapeaux d'usage déjà connus (planifié comme snack/repas), conservés. */
  asSnack?: boolean;
  asMeal?: boolean;
}

/**
 * Crée ou met à jour un plat du référentiel, avec ses ingrédients par taille.
 * L'id est la clé normalisée du nom : renommer un plat déplace donc le
 * document (écriture sous la nouvelle clé, puis suppression de l'ancienne) pour
 * que la prochaine saisie du nouveau nom retrouve ce plat au lieu d'en créer un
 * doublon. Renvoie l'id du plat.
 */
export async function saveDish(
  previousId: string | null,
  input: DishInput,
): Promise<string> {
  const name = input.name.trim();
  const id = catalogKey(name);
  if (!id) {
    throw new Error("Le nom du plat ne peut pas être vide.");
  }
  const variants = sanitizeVariants(input.variants);
  await setDoc(
    doc(db, DISHES, id),
    stripUndefined({
      name,
      translation: input.translation?.trim() || undefined,
      basis: input.basis,
      unitLabel:
        input.basis === "units" ? input.unitLabel?.trim() || undefined : undefined,
      variants,
      // Un plat défini comme snack/plat est forcément proposé comme tel.
      asSnack: input.asSnack || input.basis === "units" || undefined,
      asMeal: input.asMeal || input.basis === "persons" || undefined,
    }),
  );
  if (previousId && previousId !== id) {
    await deleteDoc(doc(db, DISHES, previousId));
  }
  return id;
}

export async function deleteDish(id: string): Promise<void> {
  await deleteDoc(doc(db, DISHES, id));
}

const PANTRY = "pantry";

export function subscribeToPantry(
  onChange: (items: PantryItem[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, PANTRY), (snapshot) => {
    onChange(
      snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as PantryItem)
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  });
}

/**
 * Met un ingrédient « en stock » (il n'est plus signalé par le contrôle des
 * oublis) ou l'en retire. L'id est le nom normalisé : idempotent.
 */
export async function setInPantry(
  name: string,
  inStock: boolean,
): Promise<void> {
  const key = catalogKey(name);
  if (!key) return;
  if (inStock) {
    await setDoc(doc(db, PANTRY, key), { name: name.trim() });
  } else {
    await deleteDoc(doc(db, PANTRY, key));
  }
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

// ---------------------------------------------------------------------------
// Paiement d'un passage chez un point de vente, et correction d'un article.
// ---------------------------------------------------------------------------

export interface PaymentInput {
  vendor: string;
  /** Passage payé (1 = premier). */
  round: number;
  amount: number;
  /** "YYYY-MM-DD" */
  date: string;
  note?: string;
  createdBy: string;
  /** Articles non pris : reportés au passage suivant du même point de vente. */
  leftoverItemIds: string[];
}

/**
 * Enregistre le paiement d'un passage et reporte les articles non pris au
 * passage suivant, de façon atomique : jamais un paiement sans report (les
 * articles manquants resteraient dans un passage déjà payé), ni l'inverse.
 * Garde ainsi les paiements séparés (ex. le lait et le yaourt, payés plus tard
 * chez un autre épicier, forment « Épicier — 2e passage »).
 */
export async function payVendorRound(
  weekId: string,
  input: PaymentInput,
): Promise<void> {
  const vendor = normalizeVendor(input.vendor);
  if (!vendor) {
    throw new Error("Indiquez le point de vente.");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Le montant doit être un nombre positif.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("La date est invalide.");
  }
  const round = input.round > 1 ? input.round : 1;
  const batch = writeBatch(db);
  batch.set(
    doc(collection(db, EXPENSES)),
    stripUndefined({
      type: "groceries",
      amount: input.amount,
      date: input.date,
      weekId,
      vendor,
      round: round > 1 ? round : undefined,
      note: input.note?.trim() || undefined,
      createdBy: input.createdBy,
      createdAt: Date.now(),
    }),
  );
  if (input.leftoverItemIds.length > 0) {
    batch.update(
      doc(db, SHOPPING_LISTS, weekId),
      Object.fromEntries(
        input.leftoverItemIds.map((id) => [`items.${id}.round`, round + 1]),
      ),
    );
  }
  await batch.commit();
}

export interface ShoppingItemPatch {
  name: string;
  translation: string;
  /**
   * Traduction affichée à l'ouverture. Vide avant ET après : rien n'est écrit, ce qui
   * évite qu'un renommage efface la traduction déjà connue du nouveau nom.
   */
  initialTranslation?: string;
  quantity: string;
  vendor: string;
}

/**
 * Corrige un article : nom, traduction, quantité, point de vente. Un champ vidé
 * est supprimé. Changer de point de vente remet l'article au premier passage.
 */
export async function updateShoppingItem(
  weekId: string,
  previous: ShoppingItem,
  patch: ShoppingItemPatch,
): Promise<void> {
  const name = patch.name.trim();
  if (!name) {
    throw new Error("Le nom de l'article ne peut pas être vide.");
  }
  const vendor = normalizeVendor(patch.vendor);
  const field = (key: string) => `items.${previous.id}.${key}`;
  const optional = (key: string, value: string): [string, unknown] => [
    field(key),
    value ? value : deleteField(),
  ];
  const quantity = patch.quantity.trim();
  await updateDoc(
    doc(db, SHOPPING_LISTS, weekId),
    Object.fromEntries([
      [field("name"), name],
      // La traduction vit dans le catalogue (voir plus bas), pas sur l'article.
      [field("translation"), deleteField()],
      optional("quantity", quantity),
      optional("vendor", vendor),
      ...(vendor !== normalizeVendor(previous.vendor)
        ? [[field("round"), deleteField()]]
        : []),
    ]),
  );
  await rememberIngredients([
    { name, vendor: vendor || undefined, quantity: quantity || undefined },
  ]);
  if (
    patch.initialTranslation === undefined ||
    patch.translation.trim() !== "" ||
    patch.initialTranslation.trim() !== ""
  ) {
    await setIngredientTranslation(name, patch.translation);
  }
}
