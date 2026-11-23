import type { DishMealType, MealPlan, MealSlot } from "../types";
import { daysOfWeek, slotKey } from "./mealPlan";

export interface PickedDish {
  label: string;
  translation?: string;
  /** Repas habituel ; « both » quand on ne sait pas. */
  type: DishMealType;
}

export interface GeneratedProgram {
  /** Créneaux à écrire : uniquement des créneaux libres, jamais un créneau déjà rempli. */
  slots: Record<string, MealSlot>;
  /** Plats servis à l'autre repas que leur habitude (faute de place au bon repas). */
  misplaced: string[];
  /** Plats sans créneau libre. */
  unplaced: string[];
  /** Snacks sans jour libre. */
  unplacedSnacks: string[];
}

/** Générateur pseudo-aléatoire reproductible : une graine = une répartition. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** `count` positions réparties régulièrement parmi `total` (de 0 à total-1). */
function spread(total: number, count: number): number[] {
  if (count <= 0) return [];
  if (count >= total) return Array.from({ length: total }, (_, i) => i);
  return Array.from({ length: count }, (_, i) => Math.floor((i * total) / count));
}

/**
 * Propose une première version du programme : les plats choisis sont répartis sur les
 * déjeuners et dîners encore libres, chacun au repas où il se sert d'habitude, et les
 * snacks sont espacés sur la semaine (chacun couvre les jours vides qui suivent). Un
 * créneau déjà rempli n'est jamais utilisé. Une même graine donne toujours la même
 * répartition ; une autre graine, une autre répartition.
 */
export function generateProgram(input: {
  plan: MealPlan;
  meals: PickedDish[];
  snacks: Array<{ label: string; translation?: string }>;
  seed: number;
}): GeneratedProgram {
  const random = rng(input.seed);
  const days = daysOfWeek(input.plan.weekId);
  const isFree = (key: string) => (input.plan.slots[key]?.items.length ?? 0) === 0;

  const freeLunch = days.map((d) => slotKey(d.key, "lunch")).filter(isFree);
  const freeDinner = days.map((d) => slotKey(d.key, "dinner")).filter(isFree);

  const slots: Record<string, MealSlot> = {};
  const put = (key: string, dish: { label: string; translation?: string }) => {
    slots[key] = {
      items: [
        {
          label: dish.label,
          ...(dish.translation ? { translation: dish.translation } : {}),
        },
      ],
    };
  };

  const lunchOnly = shuffle(input.meals.filter((m) => m.type === "lunch"), random);
  const dinnerOnly = shuffle(input.meals.filter((m) => m.type === "dinner"), random);
  const either = shuffle(input.meals.filter((m) => m.type === "both"), random);
  const leftovers: PickedDish[] = [];
  const misplaced: string[] = [];

  const fillPreferred = (dishes: PickedDish[], free: string[]) => {
    const fit = dishes.slice(0, free.length);
    leftovers.push(...dishes.slice(free.length));
    spread(free.length, fit.length).forEach((pos, i) => put(free[pos], fit[i]));
  };
  fillPreferred(lunchOnly, freeLunch);
  fillPreferred(dinnerOnly, freeDinner);

  // Créneaux restants (déjeuners et dîners dans l'ordre de la semaine) : « les deux »
  // d'abord, puis les plats qui n'ont pas trouvé leur repas.
  const remaining = days
    .flatMap((d) => [slotKey(d.key, "lunch"), slotKey(d.key, "dinner")])
    .filter((key) => (freeLunch.includes(key) || freeDinner.includes(key)) && !slots[key]);
  const queue = [...either, ...leftovers];
  const take = queue.slice(0, remaining.length);
  const unplaced = queue.slice(remaining.length).map((m) => m.label);
  spread(remaining.length, take.length).forEach((pos, i) => {
    const dish = take[i];
    const key = remaining[pos];
    put(key, dish);
    const meal = key.endsWith("_lunch") ? "lunch" : "dinner";
    if (dish.type !== "both" && dish.type !== meal) misplaced.push(dish.label);
  });

  // Snacks : un jour sur deux ou trois, sur les jours sans snack à eux.
  const snackDays = days
    .map((d) => slotKey(d.key, "snack"))
    .filter(isFree);
  const snacks = shuffle(input.snacks, random);
  const fitSnacks = snacks.slice(0, snackDays.length);
  spread(snackDays.length, fitSnacks.length).forEach((pos, i) =>
    put(snackDays[pos], fitSnacks[i]),
  );

  return {
    slots,
    misplaced,
    unplaced,
    unplacedSnacks: snacks.slice(snackDays.length).map((s) => s.label),
  };
}
