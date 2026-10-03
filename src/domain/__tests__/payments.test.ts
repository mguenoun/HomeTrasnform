import { describe, expect, it } from "vitest";
import type { BudgetItem } from "../../types";
import { paymentsByMonth } from "../payments";

function item(payments: BudgetItem["payments"]): BudgetItem {
  return {
    id: "b1",
    title: "Rubrique",
    category: "materiaux",
    objectiveId: null,
    taskId: null,
    budgeted: 1000,
    forecastHistory: [],
    payments,
    createdBy: "u1",
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("paymentsByMonth", () => {
  it("commence en septembre 2026 et s'arrête au mois courant", () => {
    const months = paymentsByMonth([], new Date(2026, 9, 15));
    expect(months.map((m) => m.key)).toEqual(["2026-09", "2026-10"]);
  });

  it("affiche au plus 6 mois glissants une fois la période dépassée", () => {
    const months = paymentsByMonth([], new Date(2027, 2, 10)); // mars 2027
    expect(months.map((m) => m.key)).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
  });

  it("additionne uniquement les paiements effectués, par mois", () => {
    const months = paymentsByMonth(
      [
        item([
          { id: "p1", date: "2026-10-02", amount: 300, status: "paye", createdBy: "u1" },
          { id: "p2", date: "2026-10-20", amount: 200, status: "paye", createdBy: "u1" },
          { id: "p3", date: "2026-09-05", amount: 500, status: "prevu", createdBy: "u1" },
        ]),
        item([{ id: "p4", date: "2026-09-01", amount: 150, status: "paye", createdBy: "u1" }]),
      ],
      new Date(2026, 9, 15),
    );
    const byKey = Object.fromEntries(months.map((m) => [m.key, m.amount]));
    expect(byKey["2026-10"]).toBe(500);
    expect(byKey["2026-09"]).toBe(150);
  });

  it("ignore les paiements antérieurs à septembre 2026", () => {
    const months = paymentsByMonth(
      [item([{ id: "p1", date: "2026-03-01", amount: 999, status: "paye", createdBy: "u1" }])],
      new Date(2026, 9, 15),
    );
    expect(months.reduce((s, m) => s + m.amount, 0)).toBe(0);
  });
});
