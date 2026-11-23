import type { MealPlan, MealSlot } from "../types";

export interface MovedSlots {
  from: MealSlot;
  to: MealSlot;
}

/**
 * Déplace un plat d'un créneau à un autre (glisser-déposer du calendrier). Le plat
 * garde tout : statut, votes, traduction, quantité. Les convives de chaque créneau ne
 * bougent pas. Renvoie `null` quand il n'y a rien à faire (même créneau, plat absent).
 */
export function moveItem(
  plan: MealPlan,
  fromKey: string,
  index: number,
  toKey: string,
): MovedSlots | null {
  if (fromKey === toKey) return null;
  const source = plan.slots[fromKey];
  const item = source?.items[index];
  if (!source || !item) return null;
  const target = plan.slots[toKey] ?? { items: [] };
  return {
    from: { ...source, items: source.items.filter((_, i) => i !== index) },
    to: { ...target, items: [...target.items, item] },
  };
}
