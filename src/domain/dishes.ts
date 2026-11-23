import type { Dish, DishMealType, DishVariant, MealPlan } from "../types";
import { catalogKey } from "./catalog";

/** Tailles proposées par défaut pour un plat (personnes). */
export const PERSON_SIZES = [2, 3, 4, 5] as const;

/**
 * Nettoie les variantes avant enregistrement : noms rognés, lignes sans nom
 * retirées, taille entière positive obligatoire, une seule variante par
 * taille (la première gagne), tailles sans ingrédient non enregistrées,
 * triées par taille croissante. Ne mute pas l'entrée.
 */
export function sanitizeVariants(variants: DishVariant[]): DishVariant[] {
  const seen = new Set<number>();
  const cleaned: DishVariant[] = [];
  for (const variant of variants) {
    if (!Number.isInteger(variant.n) || variant.n < 1 || seen.has(variant.n)) {
      continue;
    }
    const ingredients = variant.ingredients
      .map((ing) => ({
        name: ing.name.trim(),
        quantity: ing.quantity?.trim() ?? "",
      }))
      .filter((ing) => ing.name.length > 0)
      .map((ing) =>
        ing.quantity ? { name: ing.name, quantity: ing.quantity } : { name: ing.name },
      );
    if (ingredients.length === 0) continue;
    seen.add(variant.n);
    cleaned.push({ n: variant.n, ingredients });
  }
  return cleaned.sort((a, b) => a.n - b.n);
}

/** Tailles « personnes » courantes pas encore définies pour ce plat. */
export function missingPersonSizes(variants: Array<{ n: number }>): number[] {
  const defined = new Set(variants.map((v) => v.n));
  return PERSON_SIZES.filter((size) => !defined.has(size));
}

/** Résumé court pour la liste : « 2, 4, 5 pers. » / « 10, 20 petite pizza ». */
export function describeVariants(dish: Dish): string {
  const variants = dish.variants ?? [];
  if (variants.length === 0) return "sans ingrédients";
  const sizes = variants
    .map((v) => v.n)
    .sort((a, b) => a - b)
    .join(", ");
  return dish.basis === "units"
    ? `${sizes} ${dish.unitLabel?.trim() || "unités"}`
    : `${sizes} pers.`;
}

export const MEAL_TYPE_LABEL: Record<DishMealType, string> = {
  lunch: "Déjeuner",
  dinner: "Dîner",
  both: "Les deux",
};

/**
 * Repas auquel chaque plat a été servi dans les programmes déjà saisis (toutes les
 * semaines), par nom normalisé : uniquement au déjeuner, uniquement au dîner, ou aux
 * deux. Les snacks ne comptent pas. Sert d'étiquette de départ quand un plat n'en a
 * pas encore d'enregistrée.
 */
export function inferMealTypes(plans: MealPlan[]): Map<string, DishMealType> {
  const seen = new Map<string, { lunch: boolean; dinner: boolean }>();
  for (const plan of plans) {
    for (const [slot, { items }] of Object.entries(plan.slots)) {
      const meal = slot.endsWith("_lunch") ? "lunch" : slot.endsWith("_dinner") ? "dinner" : null;
      if (!meal) continue;
      for (const item of items) {
        const key = catalogKey(item.label);
        if (!key) continue;
        const entry = seen.get(key) ?? { lunch: false, dinner: false };
        entry[meal] = true;
        seen.set(key, entry);
      }
    }
  }
  const result = new Map<string, DishMealType>();
  for (const [key, { lunch, dinner }] of seen) {
    result.set(key, lunch && dinner ? "both" : lunch ? "lunch" : "dinner");
  }
  return result;
}

/** Étiquette d'un plat : celle enregistrée, sinon celle déduite des programmes (`inferred`). */
export function dishMealType(
  dish: Dish,
  inferred: Map<string, DishMealType>,
): { type: DishMealType | undefined; inferred: boolean } {
  if (dish.mealType) return { type: dish.mealType, inferred: false };
  const type = inferred.get(catalogKey(dish.name));
  return { type, inferred: type !== undefined };
}

/** Un snack n'a pas d'étiquette : « déjeuner/dîner » ne concerne que les plats. */
export function isSnackDish(dish: Dish): boolean {
  return dish.basis === "units" || (!dish.basis && !!dish.asSnack && !dish.asMeal);
}

/** Plats (hors snacks) sans étiquette enregistrée mais déductibles des programmes. */
export function inferredLabelsToSave(
  dishes: Dish[],
  inferred: Map<string, DishMealType>,
): Array<{ id: string; mealType: DishMealType }> {
  return dishes
    .filter((dish) => !dish.mealType && !isSnackDish(dish))
    .flatMap((dish) => {
      const type = inferred.get(catalogKey(dish.name));
      return type ? [{ id: dish.id, mealType: type }] : [];
    });
}
