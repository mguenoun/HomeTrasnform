import type { MealItem, MealPlan, ShoppingItem } from "../types";
import {
  MEALS,
  daysOfWeek,
  describeGroup,
  formatWeekRange,
  groupByVendor,
  itemTranslation,
  slotKey,
  type VendorGroup,
  snacksForDay,
} from "./mealPlan";
import { statusMarker } from "./mealStatus";
import { translationFor, type TranslationIndex } from "./translations";

/**
 * Tableau à partager sous forme d'image (WhatsApp ne sait pas afficher un vrai
 * tableau en texte). Une cellule est un texte multi-lignes (« \n »).
 */
export interface ShareTable {
  title: string;
  subtitle?: string;
  sections: ShareSection[];
}

export interface ShareSection {
  heading?: string;
  columns: string[];
  rows: string[][];
  /** Largeur relative de chaque colonne (même longueur que `columns`). */
  widths: number[];
}

/** Programme : comme le mode calendrier, un jour par ligne, trois colonnes de repas. */
export function buildProgramTable(
  plan: MealPlan,
  translations?: TranslationIndex,
): ShareTable {
  const cell = (
    items: MealItem[],
    suffix = "",
  ): string =>
    items
      .map((item) => {
        const translation = itemTranslation(item, translations);
        return `${statusMarker(item)}${item.label}${translation ? `\n${translation}` : ""}`;
      })
      .join("\n")
      .concat(items.length > 0 ? suffix : "");

  const rows = daysOfWeek(plan.weekId).map((day) => {
    const snacks = snacksForDay(plan, day.key);
    return [
      `${day.fr} ${day.date.getDate()}\n${day.ar}`,
      cell(snacks.items, snacks.inheritedFrom ? "\n(suite)" : ""),
      ...MEALS.filter((m) => m.key !== "snack").map((meal) =>
        cell(plan.slots[slotKey(day.key, meal.key)]?.items ?? []),
      ),
    ];
  });

  return {
    title: "Programme de la semaine — برنامج الأسبوع",
    subtitle: formatWeekRange(plan.weekId),
    sections: [
      {
        columns: [
          "Jour — اليوم",
          ...MEALS.map((m) => `${m.fr}\n${m.ar}`),
        ],
        widths: [1, 2, 2, 2],
        rows,
      },
    ],
  };
}

/** Liste de courses : un bloc par point de vente (et par passage). */
export function buildShoppingTable(
  items: ShoppingItem[],
  translations?: TranslationIndex,
): ShareTable {
  return {
    title: "Liste de courses — لائحة المشتريات",
    sections: groupByVendor(items).map((group) => ({
      heading: group.vendor
        ? describeGroup(group.vendor, group.round)
        : "Autres — أخرى",
      columns: ["Article — المادة", "Quantité — الكمية"],
      widths: [3, 1],
      rows: group.items.map((item) => {
        const translation =
          translationFor(translations, item.name) ?? item.translation;
        return [
          `${item.checked ? "✓ " : ""}${item.name}${translation ? `\n${translation}` : ""}`,
          item.quantity ?? "",
        ];
      }),
    })),
  };
}

/**
 * Tableau pour un commerçant : seulement ce qu'il reste à acheter chez lui
 * (articles non pris), sans prix ni statut.
 */
export function buildVendorTable(
  group: VendorGroup,
  translations?: TranslationIndex,
): ShareTable {
  return {
    title: describeGroup(group.vendor, group.round),
    sections: [
      {
        columns: ["Article — المادة", "Quantité — الكمية"],
        widths: [3, 1],
        rows: group.items
          .filter((item) => !item.checked)
          .map((item) => {
            const translation =
              translationFor(translations, item.name) ?? item.translation;
            return [
              `${item.name}${translation ? `\n${translation}` : ""}`,
              item.quantity ?? "",
            ];
          }),
      },
    ],
  };
}
