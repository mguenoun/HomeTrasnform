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

export interface VoteCounts {
  up: number;
  down: number;
}

/** Votes d'un plat : un par personne, plus l'ancien retour sans auteur (compté une fois). */
export function voteCounts(item: MealItem): VoteCounts {
  const counts = { up: 0, down: 0 };
  for (const vote of Object.values(item.votes ?? {})) {
    if (vote === "up") counts.up += 1;
    else if (vote === "down") counts.down += 1;
  }
  if (item.feedback === "up") counts.up += 1;
  if (item.feedback === "down") counts.down += 1;
  return counts;
}

/** Vote de cette personne, s'il existe. */
export function myVote(item: MealItem, uid: string | undefined): Feedback | undefined {
  return uid ? item.votes?.[uid] : undefined;
}

/**
 * Nouvel élément avec le vote de `uid`. Un vote par personne : voter comme
 * déjà fait l'annule ; voter l'inverse est refusé (il faut d'abord annuler),
 * l'élément est alors renvoyé tel quel. N'a de sens que pour un plat préparé.
 * La remarque, commune au plat, disparaît avec le dernier vote.
 */
export function withVote(
  item: MealItem,
  uid: string,
  vote: Feedback,
): MealItem {
  if (itemStatus(item) !== "prepared" || !uid) return item;
  const current = item.votes?.[uid];
  if (current && current !== vote) return item;
  const votes = { ...item.votes };
  if (current === vote) delete votes[uid];
  else votes[uid] = vote;
  const { votes: _votes, ...rest } = item;
  void _votes;
  const next: MealItem = Object.keys(votes).length > 0 ? { ...rest, votes } : rest;
  const counts = voteCounts(next);
  if (counts.up + counts.down === 0) delete next.feedbackNote;
  return next;
}

/** Remarque commune sur le plat (vide = efface). Sans vote, elle n'a pas lieu d'être. */
export function withFeedbackNote(item: MealItem, note: string): MealItem {
  const { feedbackNote: _note, ...rest } = item;
  void _note;
  const counts = voteCounts(item);
  const text = note.trim();
  return text && counts.up + counts.down > 0 ? { ...rest, feedbackNote: text } : rest;
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
        const counts = voteCounts(item);
        entry.up += counts.up;
        entry.down += counts.down;
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
        const counts = voteCounts(item);
        if (status === "prepared" && counts.up > counts.down) {
          liked.push({ text: lineFor(item, day.fr, translations) });
        } else if (status === "prepared" && counts.down > counts.up) {
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
