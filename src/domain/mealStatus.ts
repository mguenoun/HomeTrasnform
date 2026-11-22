import type { MealItem, MealPlan, MealSlot, MealStatus } from "../types";

/** État d'un plat : planifié tant qu'on n'a rien marqué, puis préparé ou non. */
export type ItemStatus = "planned" | MealStatus;

export type StatusFilter = "all" | ItemStatus;

/** Motifs proposés quand un plat n'est pas préparé ; la saisie reste facultative. */
export const SKIP_REASONS = ["Pas le temps", "Ingrédient manquant"] as const;

export const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Tout" },
  { key: "planned", label: "Planifié" },
  { key: "prepared", label: "Préparé" },
  { key: "skipped", label: "Non préparé" },
];

export function itemStatus(item: MealItem): ItemStatus {
  return item.status ?? "planned";
}

export function matchesFilter(item: MealItem, filter: StatusFilter): boolean {
  return filter === "all" || itemStatus(item) === filter;
}

/**
 * Programme réduit aux éléments du statut demandé (les créneaux vidés
 * disparaissent). Les snacks reportés suivent : le report se recalcule sur ce
 * qui reste, donc un snack non préparé n'est jamais « reporté » en préparé.
 */
export function filterPlan(plan: MealPlan, filter: StatusFilter): MealPlan {
  if (filter === "all") return plan;
  const slots: MealPlan["slots"] = {};
  for (const [key, slot] of Object.entries(plan.slots)) {
    const items = slot.items.filter((item) => matchesFilter(item, filter));
    if (items.length > 0) slots[key] = { ...slot, items };
  }
  return { ...plan, slots };
}

export function countByStatus(plan: MealPlan): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: 0,
    planned: 0,
    prepared: 0,
    skipped: 0,
  };
  for (const slot of Object.values(plan.slots)) {
    for (const item of slot.items) {
      counts.all += 1;
      counts[itemStatus(item)] += 1;
    }
  }
  return counts;
}

/**
 * Nouvel élément avec le statut demandé. « planned » retire le statut ; le motif
 * ne se conserve que pour « skipped ».
 */
export function withStatus(
  item: MealItem,
  status: ItemStatus,
  reason?: string,
): MealItem {
  // Le retour (👍/👎) n'a de sens que pour un plat préparé : tout autre statut
  // l'efface, sans quoi un plat repassé à « planifié » garderait une note.
  const {
    status: _status,
    skipReason: _reason,
    feedback: _feedback,
    votes: _votes,
    feedbackNote: _feedbackNote,
    ...rest
  } = item;
  void _status;
  void _reason;
  if (status === "planned") return rest;
  if (status === "prepared") {
    // On conserve le retour déjà donné quand on re-marque « préparé ».
    return {
      ...rest,
      status,
      ...(_feedback ? { feedback: _feedback } : {}),
      ...(_votes ? { votes: _votes } : {}),
      ...((_feedback || _votes) && _feedbackNote ? { feedbackNote: _feedbackNote } : {}),
    };
  }
  const note = reason?.trim();
  return status === "skipped" && note
    ? { ...rest, status, skipReason: note }
    : { ...rest, status };
}

/** Marque préparés tous les éléments encore planifiés (les non préparés restent tels quels). */
export function markPlannedAsPrepared(slot: MealSlot): MealSlot {
  return {
    ...slot,
    items: slot.items.map((item) =>
      itemStatus(item) === "planned" ? withStatus(item, "prepared") : item,
    ),
  };
}

/** "✅ ", "❌ " ou rien : repère de statut pour les messages. */
export function statusMarker(item: MealItem): string {
  const status = itemStatus(item);
  return status === "prepared" ? "✅ " : status === "skipped" ? "❌ " : "";
}
