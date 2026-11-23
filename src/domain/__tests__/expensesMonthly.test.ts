import { describe, expect, it } from "vitest";
import type { HouseholdExpense } from "../../types";
import { daysOfWeek } from "../mealPlan";
import { expensesByMonth, missingHelperDays } from "../expenses";

function expense(partial: Partial<HouseholdExpense>): HouseholdExpense {
  return {
    id: "x",
    type: "groceries",
    amount: 100,
    date: "2026-11-21",
    weekId: "2026-11-21",
    createdBy: "u1",
    createdAt: 1,
    ...partial,
  };
}

describe("expensesByMonth", () => {
  const now = new Date(2026, 10, 23); // 23 novembre 2026

  it("couvre les six derniers mois, du plus ancien au plus récent, même à zéro", () => {
    const months = expensesByMonth([], now);
    expect(months.map((m) => m.key)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(months.every((m) => m.total === 0)).toBe(true);
  });

  it("sépare courses et ménage, et additionne les semaines d'un même mois", () => {
    const months = expensesByMonth(
      [
        expense({ amount: 300, date: "2026-11-03" }),
        expense({ amount: 200, date: "2026-11-21" }),
        expense({ type: "helper", amount: 200, date: "2026-11-10" }),
        expense({ amount: 50, date: "2026-10-30" }),
      ],
      now,
    );
    const nov = months.at(-1)!;
    expect(nov).toMatchObject({ groceries: 500, helper: 200, total: 700 });
    expect(months.at(-2)).toMatchObject({ groceries: 50, helper: 0, total: 50 });
  });

  it("ignore ce qui est hors de la fenêtre", () => {
    const months = expensesByMonth([expense({ date: "2025-01-05" })], now);
    expect(months.reduce((s, m) => s + m.total, 0)).toBe(0);
  });

  it("passe correctement une année", () => {
    const months = expensesByMonth([], new Date(2027, 1, 10));
    expect(months[0].key).toBe("2026-09");
    expect(months.at(-1)!.key).toBe("2027-02");
  });
});

describe("missingHelperDays", () => {
  const days = daysOfWeek("2026-11-21"); // sam 21 → ven 27

  it("propose les jours habituels passés sans paiement (samedi, mardi, jeudi)", () => {
    const today = new Date(2026, 10, 25); // mercredi
    expect(missingHelperDays([], days, today).map((d) => d.key)).toEqual(["sat", "tue"]);
  });

  it("ne propose pas un jour à venir, mais bien aujourd'hui", () => {
    expect(missingHelperDays([], days, new Date(2026, 10, 21)).map((d) => d.key)).toEqual(["sat"]);
    expect(missingHelperDays([], days, new Date(2026, 10, 20))).toEqual([]);
  });

  it("ne propose pas un jour déjà payé", () => {
    const paid = [expense({ type: "helper", date: "2026-11-21" })];
    expect(missingHelperDays(paid, days, new Date(2026, 10, 25)).map((d) => d.key)).toEqual(["tue"]);
  });

  it("un paiement de courses le même jour ne compte pas", () => {
    const groceries = [expense({ type: "groceries", date: "2026-11-21" })];
    expect(missingHelperDays(groceries, days, new Date(2026, 10, 21)).map((d) => d.key)).toEqual(["sat"]);
  });
});
