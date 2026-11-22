import type {
  Dish,
  DishIngredient,
  MealItem,
  MealPlan,
  ShoppingItem,
} from "../types";
import { catalogKey } from "./catalog";
import { MEALS, daysOfWeek, dinersOf, slotKey } from "./mealPlan";
import { itemStatus } from "./mealStatus";
import { translationFor, type TranslationIndex } from "./translations";

// ---------------------------------------------------------------------------
// Choix de la recette selon le nombre de personnes / d'unités
// ---------------------------------------------------------------------------

export interface ResolvedRecipe {
  ingredients: DishIngredient[];
  /** Taille non définie exactement : quantités estimées, à vérifier. */
  approx: boolean;
}

/** Plafond du calcul de combinaisons (au-delà : proportionnel). */
const MAX_COMBINATION_SIZE = 500;

/** Met à l'échelle le nombre en tête d'une quantité libre ("2 kg" x1.5 = "3 kg"). */
export function scaleQuantity(
  quantity: string | undefined,
  factor: number,
): string | undefined {
  if (!quantity) return quantity;
  const match = /^(\d+(?:[.,]\d+)?)(.*)$/.exec(quantity.trim());
  // « نصف كيلو », « 1/4 » : pas de nombre simple en tête, on ne devine pas.
  if (!match || match[2].startsWith("/")) return quantity;
  const value = Number(match[1].replace(",", ".")) * factor;
  return `${Number(value.toFixed(2))}${match[2]}`;
}

/** Fusionne des listes d'ingrédients : un même ingrédient additionne ses quantités. */
export function mergeIngredients(lists: DishIngredient[][]): DishIngredient[] {
  const merged = new Map<string, DishIngredient>();
  for (const ingredient of lists.flat()) {
    const key = catalogKey(ingredient.name);
    if (!key) continue;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...ingredient });
    } else if (ingredient.quantity) {
      existing.quantity = existing.quantity
        ? `${existing.quantity} + ${ingredient.quantity}`
        : ingredient.quantity;
    }
  }
  return [...merged.values()];
}

/**
 * Ingrédients d'un plat pour `n` personnes (ou unités). Dans l'ordre :
 * 1. la variante exacte ;
 * 2. sinon une combinaison de variantes dont la somme vaut `n`, en préférant le
 *    moins de parts puis les plus grandes (6 = 4 + 2 ; 8 = 4 + 4) ;
 * 3. sinon la variante la plus proche, mise à l'échelle et marquée `approx`.
 * `null` si le plat n'a aucune variante.
 *
 * Limite connue de 2 : additionner deux variantes peut sur-estimer un ingrédient
 * qui n'est pas proportionnel (une épice, un fond de cuisson).
 */
export function resolveVariant(dish: Dish, n: number): ResolvedRecipe | null {
  const variants = [...(dish.variants ?? [])].sort((a, b) => a.n - b.n);
  if (variants.length === 0) return null;

  if (!Number.isInteger(n) || n < 1) {
    return { ingredients: variants[0].ingredients, approx: true };
  }

  const exact = variants.find((v) => v.n === n);
  if (exact) return { ingredients: exact.ingredients, approx: false };

  if (n <= MAX_COMBINATION_SIZE) {
    // Nombre minimal de parts pour atteindre exactement n (pièces illimitées).
    const sizes = variants.map((v) => v.n).sort((a, b) => b - a);
    const parts: number[] = Array(n + 1).fill(Infinity);
    const choice: number[] = Array(n + 1).fill(0);
    parts[0] = 0;
    for (let total = 1; total <= n; total++) {
      for (const size of sizes) {
        if (size <= total && parts[total - size] + 1 < parts[total]) {
          parts[total] = parts[total - size] + 1;
          choice[total] = size;
        }
      }
    }
    if (Number.isFinite(parts[n])) {
      const used: number[] = [];
      for (let rest = n; rest > 0; rest -= choice[rest]) used.push(choice[rest]);
      return {
        ingredients: mergeIngredients(
          used.map((size) => variants.find((v) => v.n === size)!.ingredients),
        ),
        approx: false,
      };
    }
  }

  // Variante la plus proche (à égalité, la plus grande), mise à l'échelle.
  const nearest = variants.reduce((best, v) =>
    Math.abs(v.n - n) < Math.abs(best.n - n) ||
    (Math.abs(v.n - n) === Math.abs(best.n - n) && v.n > best.n)
      ? v
      : best,
  );
  const factor = n / nearest.n;
  return {
    ingredients: nearest.ingredients.map((ing) => ({
      name: ing.name,
      ...(ing.quantity ? { quantity: scaleQuantity(ing.quantity, factor) } : {}),
    })),
    approx: true,
  };
}

// ---------------------------------------------------------------------------
// Présence d'un ingrédient dans la liste de courses
// ---------------------------------------------------------------------------

/** Deux noms normalisés désignent la même chose (égalité, ou inclusion d'au moins 3 lettres). */
function keysMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 3 && (a.includes(b) || b.includes(a));
}

/** Le nom et sa traduction connue, normalisés : on compare dans les deux langues. */
function nameForms(
  name: string,
  translations?: TranslationIndex,
  own?: string,
): string[] {
  return [name, translationFor(translations, name), own]
    .filter((v): v is string => !!v)
    .map(catalogKey)
    .filter(Boolean);
}

export function isOnList(
  ingredientName: string,
  listItems: ShoppingItem[],
  translations?: TranslationIndex,
): boolean {
  const wanted = nameForms(ingredientName, translations);
  return listItems.some((item) => {
    const present = nameForms(item.name, translations, item.translation);
    return wanted.some((a) => present.some((b) => keysMatch(a, b)));
  });
}

export function isInPantry(
  ingredientName: string,
  pantryKeys: Set<string>,
  translations?: TranslationIndex,
): boolean {
  return nameForms(ingredientName, translations).some((k) => pantryKeys.has(k));
}

// ---------------------------------------------------------------------------
// Contrôle de couverture : le programme prévoit-il des plats dont des
// ingrédients ne sont pas dans la liste ?
// ---------------------------------------------------------------------------

export type CheckStatus = "ok" | "missing" | "no-recipe";

export interface DishCheck {
  slot: string;
  dayKey: string;
  dayFr: string;
  mealKey: string;
  mealFr: string;
  item: MealItem;
  dish?: Dish;
  /** Nombre de personnes ou d'unités utilisé pour choisir la recette. */
  n: number | undefined;
  approx: boolean;
  status: CheckStatus;
  ingredients: DishIngredient[];
  missing: DishIngredient[];
}

/**
 * Pour chaque plat **encore planifié** (ni préparé, ni marqué non préparé),
 * compare les ingrédients de sa recette à la liste de courses. Un plat sans
 * recette n'est pas ignoré en silence : il est signalé « no-recipe ». Les
 * ingrédients « en stock » (garde-manger) ne sont jamais signalés.
 */
export function checkCoverage({
  plan,
  dishes,
  listItems,
  translations,
  pantryKeys = new Set<string>(),
}: {
  plan: MealPlan;
  dishes: Dish[];
  listItems: ShoppingItem[];
  translations?: TranslationIndex;
  pantryKeys?: Set<string>;
}): DishCheck[] {
  const checks: DishCheck[] = [];
  for (const day of daysOfWeek(plan.weekId)) {
    for (const meal of MEALS) {
      const key = slotKey(day.key, meal.key);
      const slot = plan.slots[key];
      for (const item of slot?.items ?? []) {
        if (itemStatus(item) !== "planned") continue;
        const dishKey = catalogKey(item.label);
        const dish = dishes.find(
          (d) => d.id === dishKey || catalogKey(d.name) === dishKey,
        );
        const base = {
          slot: key,
          dayKey: day.key,
          dayFr: day.fr,
          mealKey: meal.key,
          mealFr: meal.fr,
          item,
          dish,
        };
        if (!dish || (dish.variants ?? []).length === 0) {
          checks.push({
            ...base,
            n: undefined,
            approx: false,
            status: "no-recipe",
            ingredients: [],
            missing: [],
          });
          continue;
        }
        // Un snack « par unités » se règle sur la quantité saisie ; un plat sur les convives.
        const n =
          dish.basis === "units"
            ? item.n
            : meal.key === "snack"
              ? plan.defaultDiners
              : dinersOf(plan, slot);
        const recipe = resolveVariant(dish, n as number)!;
        const missing = recipe.ingredients.filter(
          (ing) =>
            !isInPantry(ing.name, pantryKeys, translations) &&
            !isOnList(ing.name, listItems, translations),
        );
        checks.push({
          ...base,
          n,
          approx: recipe.approx,
          status: missing.length > 0 ? "missing" : "ok",
          ingredients: recipe.ingredients,
          missing,
        });
      }
    }
  }
  return checks;
}

export interface NeededIngredient extends DishIngredient {
  /** Plats qui en ont besoin (« Samedi · Dîner — شعرية الحليب »). */
  forDishes: string[];
}

/** Ingrédients manquants, regroupés : un même ingrédient demandé par plusieurs plats n'apparaît qu'une fois. */
export function collectMissing(checks: DishCheck[]): NeededIngredient[] {
  const needed = new Map<string, NeededIngredient>();
  for (const check of checks) {
    const where = `${check.dayFr} · ${check.mealFr} — ${check.item.label}`;
    for (const ingredient of check.missing) {
      const key = catalogKey(ingredient.name);
      const existing = needed.get(key);
      if (!existing) {
        needed.set(key, { ...ingredient, forDishes: [where] });
      } else {
        if (ingredient.quantity) {
          existing.quantity = existing.quantity
            ? `${existing.quantity} + ${ingredient.quantity}`
            : ingredient.quantity;
        }
        existing.forDishes.push(where);
      }
    }
  }
  return [...needed.values()];
}
