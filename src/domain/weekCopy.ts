import type { MealItem, MealPlan, MealSlot } from "../types";
import { catalogKey } from "./catalog";

/** Ce qui se recopie d'un plat : son nom, sa traduction, sa quantité. Jamais statut ni votes. */
function copyOf(item: MealItem): MealItem {
  return {
    label: item.label,
    ...(item.translation ? { translation: item.translation } : {}),
    ...(item.n ? { n: item.n } : {}),
  };
}

export interface WeekCopy {
  slots: Record<string, MealSlot>;
  /** Nombre de créneaux recopiés. */
  copied: number;
  /** Créneaux de la semaine précédente non recopiés car déjà remplis cette semaine. */
  skipped: number;
}

/**
 * Prépare une nouvelle semaine à partir de la précédente : les plats (sans statut ni votes)
 * et les convives de chaque créneau. Un créneau déjà rempli cette semaine n'est jamais
 * touché : la recopie complète, elle n'écrase pas.
 */
export function copyPreviousWeek(previous: MealPlan, current: MealPlan): WeekCopy {
  const slots: Record<string, MealSlot> = {};
  let skipped = 0;
  for (const [key, slot] of Object.entries(previous.slots)) {
    if (slot.items.length === 0) continue;
    if ((current.slots[key]?.items.length ?? 0) > 0) {
      skipped += 1;
      continue;
    }
    slots[key] = {
      ...(slot.diners !== undefined ? { diners: slot.diners } : {}),
      items: slot.items.map(copyOf),
    };
  }
  return { slots, copied: Object.keys(slots).length, skipped };
}

export interface MergedImport {
  slots: Record<string, MealItem[]>;
  /** Plats du texte déjà présents dans leur créneau : conservés tels quels (statut, votes). */
  kept: number;
  /** Créneaux déjà remplis qui perdent au moins un plat. */
  replaced: number;
  /** Plats actuels qui disparaissent parce qu'absents du texte collé. */
  removed: number;
  /** Parmi eux, ceux qui portent un statut (préparé / non préparé). */
  removedWithStatus: number;
}

/**
 * Applique un programme collé sur la semaine sans perdre le travail déjà fait : un plat
 * déjà présent dans son créneau (même nom) garde son statut, ses votes et sa traduction.
 * Les créneaux collés remplacent le contenu du créneau ; les autres ne sont pas touchés.
 */
export function mergeImportedSlots(
  current: MealPlan,
  imported: Record<string, MealItem[]>,
): MergedImport {
  const slots: Record<string, MealItem[]> = {};
  let kept = 0;
  let replaced = 0;
  let removed = 0;
  let removedWithStatus = 0;

  for (const [key, items] of Object.entries(imported)) {
    const existing = current.slots[key]?.items ?? [];
    const byName = new Map<string, MealItem>();
    for (const item of existing) {
      const name = catalogKey(item.label);
      if (!byName.has(name)) byName.set(name, item);
    }
    const used = new Set<MealItem>();
    slots[key] = items.map((item) => {
      const match = byName.get(catalogKey(item.label));
      if (match && !used.has(match)) {
        used.add(match);
        kept += 1;
        return match;
      }
      return item;
    });
    const dropped = existing.filter((item) => !used.has(item));
    removed += dropped.length;
    removedWithStatus += dropped.filter((item) => item.status).length;
    // Seul ce qui disparaît mérite une confirmation ; ajouter un plat n'enlève rien.
    if (dropped.length > 0) replaced += 1;
  }
  return { slots, kept, replaced, removed, removedWithStatus };
}
