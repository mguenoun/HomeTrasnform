import { describe, expect, it } from "vitest";
import { wrapLines } from "../../services/tableImage";
import type { MealPlan, ShoppingItem } from "../../types";
import { buildProgramTable, buildShoppingTable } from "../shareTable";
import { buildTranslationIndex } from "../translations";

const plan: MealPlan = {
  weekId: "2026-11-21",
  defaultDiners: 4,
  slots: {
    sat_lunch: {
      items: [
        { label: "Couscous", status: "prepared" },
        { label: "Salade", translation: "سلطة" },
      ],
    },
    sat_snack: { items: [{ label: "Cake" }] },
    sun_dinner: { items: [{ label: "Tajine" }] },
  },
};

describe("buildProgramTable", () => {
  const table = buildProgramTable(plan);
  const rows = table.sections[0].rows;

  it("a un jour par ligne et une colonne par repas", () => {
    expect(rows).toHaveLength(7);
    expect(table.sections[0].columns).toHaveLength(4);
    expect(rows.every((r) => r.length === 4)).toBe(true);
    expect(rows[0][0]).toContain("Samedi 21");
  });

  it("met les plats dans la bonne case, avec statut et traduction", () => {
    expect(rows[0][2]).toBe("✅ Couscous\nSalade\nسلطة");
    expect(rows[1][3]).toBe("Tajine");
  });

  it("reporte les snacks sur les jours suivants, marqués (suite)", () => {
    expect(rows[0][1]).toBe("Cake");
    expect(rows[1][1]).toBe("Cake\n(suite)");
  });

  it("utilise les traductions connues", () => {
    const withIndex = buildProgramTable(
      plan,
      buildTranslationIndex([{ name: "Tajine", translation: "طاجين" }]),
    );
    expect(withIndex.sections[0].rows[1][3]).toBe("Tajine\nطاجين");
  });
});

describe("buildShoppingTable", () => {
  const items: ShoppingItem[] = [
    { id: "a", name: "Lait", quantity: "2 L", vendor: "Épicier", checked: true, createdAt: 1 },
    { id: "b", name: "Sel", vendor: "Épicier", checked: false, createdAt: 2, translation: "ملح" },
    { id: "c", name: "Thym", checked: false, createdAt: 3 },
  ];
  const table = buildShoppingTable(items);

  it("fait un bloc par point de vente, sans point de vente en dernier", () => {
    expect(table.sections.map((s) => s.heading)).toEqual(["Épicier", "Autres — أخرى"]);
  });

  it("une ligne par article avec sa quantité, les articles pris marqués", () => {
    const rows = table.sections[0].rows;
    expect(rows).toEqual([
      ["Sel\nملح", ""],
      ["✓ Lait", "2 L"],
    ]);
  });
});

describe("wrapLines", () => {
  const measure = (t: string) => t.length;

  it("coupe aux espaces et respecte les retours à la ligne", () => {
    expect(wrapLines(measure, "un deux trois", 8)).toEqual(["un deux", "trois"]);
    expect(wrapLines(measure, "a\nb", 10)).toEqual(["a", "b"]);
  });

  it("découpe un mot plus large que la colonne", () => {
    expect(wrapLines(measure, "abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });
});
