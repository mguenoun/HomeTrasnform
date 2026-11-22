import type { Dish, DishVariant } from "../types";

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
