import type { Dish, MealItem, MealPlan } from "../types";
import { catalogKey } from "./catalog";
import { MEALS, daysOfWeek, formatWeekRange, itemTranslation, slotKey } from "./mealPlan";
import { itemStatus } from "./mealStatus";
import type { TranslationIndex } from "./translations";

// ---------------------------------------------------------------------------
// Retour sur les plats consommés (👍 / 👎 + remarque), seulement sur ce qui a
// été préparé.
// ---------------------------------------------------------------------------

export type Feedback = "up" | "down";

/**
 * Nouvel élément avec ce retour. N'a de sens que pour un plat préparé : sinon
 * l'élément est renvoyé tel quel. `null` efface le retour et sa remarque.
 */
export function withFeedback(
  item: MealItem,
  feedback: Feedback | null,
  note?: string,
): MealItem {
  if (itemStatus(item) !== "prepared") return item;
  const { feedback: _feedback, feedbackNote: _note, ...rest } = item;
  void _feedback;
  void _note;
  if (!feedback) return rest;
  const text = note?.trim();
  return text
    ? { ...rest, feedback, feedbackNote: text }
    : { ...rest, feedback };
}

// ---------------------------------------------------------------------------
// Statistiques par plat, sur toutes les semaines.
// ---------------------------------------------------------------------------

export interface DishStats {
  /** Nombre de fois préparé. */
  served: number;
  up: number;
  down: number;
  /** Semaine (id) de la dernière préparation. */
  lastWeek?: string;
}

/**
 * Agrège les plats préparés de toutes les semaines, par nom normalisé.
 * Un plat planifié ou non préparé n'est pas « servi » et ne compte pas.
 */
export function computeDishStats(plans: MealPlan[]): Map<string, DishStats> {
  const stats = new Map<string, DishStats>();
  for (const plan of plans) {
    for (const slot of Object.values(plan.slots)) {
      for (const item of slot.items) {
        if (itemStatus(item) !== "prepared") continue;
        const key = catalogKey(item.label);
        if (!key) continue;
        const entry = stats.get(key) ?? { served: 0, up: 0, down: 0 };
        entry.served += 1;
        if (item.feedback === "up") entry.up += 1;
        if (item.feedback === "down") entry.down += 1;
        if (!entry.lastWeek || plan.weekId > entry.lastWeek) {
          entry.lastWeek = plan.weekId;
        }
        stats.set(key, entry);
      }
    }
  }
  return stats;
}

/** Part de 👍 parmi les retours donnés ; `undefined` sans aucun retour. */
export function approvalRate(stats: DishStats | undefined): number | undefined {
  if (!stats) return undefined;
  const given = stats.up + stats.down;
  return given === 0 ? undefined : stats.up / given;
}

export type DishSort = "name" | "approval" | "served";

/**
 * Tri de la bibliothèque. « Mieux notés » : taux d'appréciation décroissant, à
 * égalité le plus de 👍, puis le nom ; les plats sans retour passent après.
 */
export function sortDishes(
  dishes: Dish[],
  stats: Map<string, DishStats>,
  sort: DishSort,
): Dish[] {
  const byName = (a: Dish, b: Dish) => a.name.localeCompare(b.name);
  const statsOf = (dish: Dish) => stats.get(catalogKey(dish.name));
  return [...dishes].sort((a, b) => {
    if (sort === "name") return byName(a, b);
    if (sort === "served") {
      return (statsOf(b)?.served ?? 0) - (statsOf(a)?.served ?? 0) || byName(a, b);
    }
    const ra = approvalRate(statsOf(a));
    const rb = approvalRate(statsOf(b));
    if (ra === undefined && rb === undefined) return byName(a, b);
    if (ra === undefined) return 1;
    if (rb === undefined) return -1;
    return rb - ra || (statsOf(b)?.up ?? 0) - (statsOf(a)?.up ?? 0) || byName(a, b);
  });
}

// ---------------------------------------------------------------------------
// Message de fin de semaine pour la personne de ménage.
// ---------------------------------------------------------------------------

interface FeedbackLine {
  text: string;
}

function lineFor(
  item: MealItem,
  dayFr: string,
  translations?: TranslationIndex,
): string {
  const translation = itemTranslation(item, translations);
  const name = translation ? `${item.label} — ${translation}` : item.label;
  const note = item.feedbackNote ? ` : ${item.feedbackNote}` : "";
  return `${name} (${dayFr.toLowerCase()})${note}`;
}

/**
 * Retour de fin de semaine, bilingue, ton bienveillant : remerciements, ce qui a
 * été apprécié, ce qui est à améliorer (avec la remarque), et ce qui n'a pas pu
 * être préparé (avec le motif). Jamais de note chiffrée. Pensé comme un point de
 * départ : l'utilisateur le relit et le modifie avant l'envoi.
 */
export function buildFeedbackMessage(
  plan: MealPlan,
  translations?: TranslationIndex,
): string {
  const liked: FeedbackLine[] = [];
  const improve: FeedbackLine[] = [];
  const notPrepared: FeedbackLine[] = [];

  for (const day of daysOfWeek(plan.weekId)) {
    for (const meal of MEALS) {
      for (const item of plan.slots[slotKey(day.key, meal.key)]?.items ?? []) {
        const status = itemStatus(item);
        if (status === "prepared" && item.feedback === "up") {
          liked.push({ text: lineFor(item, day.fr, translations) });
        } else if (status === "prepared" && item.feedback === "down") {
          improve.push({ text: lineFor(item, day.fr, translations) });
        } else if (status === "skipped") {
          const reason = item.skipReason ? ` : ${item.skipReason}` : "";
          const base = lineFor({ ...item, feedbackNote: undefined }, day.fr, translations);
          notPrepared.push({ text: `${base}${reason}` });
        }
      }
    }
  }

  const lines = [
    "*Retour de la semaine — ملاحظات الأسبوع*",
    formatWeekRange(plan.weekId),
    "",
    "Merci pour cette semaine ! — شكرا على هذا الأسبوع !",
  ];
  const section = (title: string, icon: string, entries: FeedbackLine[]) => {
    if (entries.length === 0) return;
    lines.push("", `*${title}*`, ...entries.map((e) => `${icon} ${e.text}`));
  };
  section("Très appréciés — أعجبنا", "👍", liked);
  section("À améliorer — للتحسين", "👎", improve);
  section("Pas préparés — لم يتم تحضيرها", "❌", notPrepared);
  return lines.join("\n");
}
