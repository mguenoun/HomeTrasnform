import type { DishCourse, DishMealType, MealItem, MealPlan, MealSlot } from "../types";
import { catalogKey } from "./catalog";
import { daysOfWeek, slotKey } from "./mealPlan";

export interface PickedDish {
  label: string;
  translation?: string;
  /** Repas habituel ; « both » quand on ne sait pas. */
  type: DishMealType;
  /** Plat principal (défaut), entrée, accompagnement, dessert. */
  course?: DishCourse;
  /** Jour habituel (ex. "fri" pour le couscous du vendredi). */
  preferredDay?: string;
}

export interface GeneratedProgram {
  /**
   * Plats AJOUTÉS par créneau (jamais ceux déjà en place). Un plat principal ou un
   * snack n'est ajouté que dans un créneau vide ; une entrée, un accompagnement ou un
   * dessert complète un repas qui a déjà (ou va avoir) son plat principal.
   */
  slots: Record<string, MealSlot>;
  /** Créneaux qui étaient vides à la génération : à ne pas écrire s'ils ont été remplis depuis. */
  emptyOnly: string[];
  /** Plats servis à l'autre repas que leur habitude (faute de place au bon repas). */
  misplaced: string[];
  /** Plats principaux sans créneau libre. */
  unplaced: string[];
  /** Snacks sans jour libre. */
  unplacedSnacks: string[];
  /** Entrées, accompagnements, desserts sans repas à compléter. */
  unplacedExtras: string[];
  /** Plats à jour préféré qui n'ont pas pu être mis ce jour-là (créneau déjà pris). */
  dayMissed: string[];
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

const mealOf = (key: string) => (key.endsWith("_lunch") ? "lunch" : "dinner");

/**
 * Propose une première version du programme, ou complète celui qui existe :
 * - les plats principaux vont dans les déjeuners et dîners libres, d'abord à leur jour
 *   préféré (le couscous du vendredi), puis au repas où ils se servent d'habitude ;
 * - les entrées, accompagnements et desserts complètent les repas qui ont un plat
 *   principal (déjà saisi ou ajouté ici), au plus un de chaque sorte par repas ;
 * - les snacks sont espacés sur la semaine (chacun couvre les jours vides qui suivent).
 * Rien de ce qui est déjà saisi n'est retiré ni déplacé. Une même graine donne toujours
 * la même répartition ; une autre graine, une autre répartition.
 */
export function generateProgram(input: {
  plan: MealPlan;
  meals: PickedDish[];
  snacks: Array<{ label: string; translation?: string }>;
  seed: number;
  /** Catégorie d'un plat déjà au programme (d'après la bibliothèque) ; défaut : principal. */
  courseOf?: (label: string) => DishCourse;
}): GeneratedProgram {
  const random = rng(input.seed);
  const days = daysOfWeek(input.plan.weekId);
  const courseOf = input.courseOf ?? (() => "main" as DishCourse);
  const existing = (key: string): MealItem[] => input.plan.slots[key]?.items ?? [];
  const isFree = (key: string) => existing(key).length === 0;

  const added: Record<string, MealItem[]> = {};
  const add = (key: string, dish: { label: string; translation?: string }) => {
    (added[key] ??= []).push({
      label: dish.label,
      ...(dish.translation ? { translation: dish.translation } : {}),
    });
  };

  const mains = input.meals.filter((m) => (m.course ?? "main") === "main");
  const extras = input.meals.filter((m) => (m.course ?? "main") !== "main");

  // --- Plats principaux -------------------------------------------------------------
  const mealKeys = days.flatMap((d) => [slotKey(d.key, "lunch"), slotKey(d.key, "dinner")]);
  const taken = new Set(mealKeys.filter((key) => !isFree(key)));
  const misplaced: string[] = [];
  const dayMissed: string[] = [];

  // 1. Jour préféré : au repas habituel de ce jour-là (le déjeuner d'abord si « les deux »).
  const flexible: PickedDish[] = [];
  for (const dish of shuffle(mains, random)) {
    if (!dish.preferredDay || !days.some((d) => d.key === dish.preferredDay)) {
      flexible.push(dish);
      continue;
    }
    const candidates =
      dish.type === "lunch"
        ? ["lunch"]
        : dish.type === "dinner"
          ? ["dinner"]
          : ["lunch", "dinner"];
    const key = candidates
      .map((meal) => slotKey(dish.preferredDay!, meal))
      .find((k) => !taken.has(k));
    if (key) {
      add(key, dish);
      taken.add(key);
    } else {
      dayMissed.push(dish.label);
      flexible.push(dish);
    }
  }

  // 2. Les autres : au repas habituel, étalés sur la semaine.
  const freeLunch = mealKeys.filter((k) => mealOf(k) === "lunch" && !taken.has(k));
  const freeDinner = mealKeys.filter((k) => mealOf(k) === "dinner" && !taken.has(k));
  const leftovers: PickedDish[] = [];
  const fillPreferred = (dishes: PickedDish[], free: string[]) => {
    const fit = dishes.slice(0, free.length);
    leftovers.push(...dishes.slice(free.length));
    spread(free.length, fit.length).forEach((pos, i) => {
      add(free[pos], fit[i]);
      taken.add(free[pos]);
    });
  };
  fillPreferred(flexible.filter((m) => m.type === "lunch"), freeLunch);
  fillPreferred(flexible.filter((m) => m.type === "dinner"), freeDinner);

  // 3. Ce qui reste : « les deux » d'abord, puis ceux qui n'ont pas trouvé leur repas.
  const remaining = mealKeys.filter((k) => !taken.has(k));
  const queue = [...flexible.filter((m) => m.type === "both"), ...leftovers];
  const take = queue.slice(0, remaining.length);
  const unplaced = queue.slice(remaining.length).map((m) => m.label);
  spread(remaining.length, take.length).forEach((pos, i) => {
    const key = remaining[pos];
    add(key, take[i]);
    taken.add(key);
    if (take[i].type !== "both" && take[i].type !== mealOf(key)) misplaced.push(take[i].label);
  });

  // --- Entrées, accompagnements, desserts ------------------------------------------
  // Repas qui ont (ou vont avoir) un plat principal.
  const served = mealKeys.filter((key) =>
    [...existing(key).map((i) => courseOf(i.label)), ...(added[key] ? ["main" as const] : [])].includes("main"),
  );
  const hasCourse = (key: string, course: DishCourse) =>
    existing(key).some((i) => courseOf(i.label) === course) ||
    (added[key] ?? []).some((i) =>
      extras.some((e) => catalogKey(e.label) === catalogKey(i.label) && e.course === course),
    );
  const unplacedExtras: string[] = [];
  for (const course of ["starter", "side", "dessert"] as const) {
    const dishes = shuffle(extras.filter((e) => e.course === course), random);
    const open = served.filter((key) => !hasCourse(key, course));
    const used = new Set<string>();
    spread(open.length, dishes.length).forEach((ideal, i) => {
      const dish = dishes[i];
      // Au plus près de sa place idéale, au bon repas si possible, sinon n'importe lequel.
      const order = open
        .map((key, index) => ({ key, distance: Math.abs(index - ideal) }))
        .sort((a, b) => a.distance - b.distance)
        .map((c) => c.key)
        .filter((key) => !used.has(key));
      const key =
        order.find((k) => dish.type === "both" || mealOf(k) === dish.type) ?? order[0];
      if (!key) {
        unplacedExtras.push(dish.label);
        return;
      }
      used.add(key);
      add(key, dish);
    });
    unplacedExtras.push(...dishes.slice(open.length).map((d) => d.label));
  }

  // --- Snacks -----------------------------------------------------------------------
  const snackDays = days.map((d) => slotKey(d.key, "snack")).filter(isFree);
  const snacks = shuffle(input.snacks, random);
  const fitSnacks = snacks.slice(0, snackDays.length);
  spread(snackDays.length, fitSnacks.length).forEach((pos, i) => add(snackDays[pos], fitSnacks[i]));

  return {
    slots: Object.fromEntries(Object.entries(added).map(([key, items]) => [key, { items }])),
    emptyOnly: Object.keys(added).filter(isFree),
    misplaced,
    unplaced,
    unplacedSnacks: snacks.slice(snackDays.length).map((s) => s.label),
    unplacedExtras,
    dayMissed,
  };
}
