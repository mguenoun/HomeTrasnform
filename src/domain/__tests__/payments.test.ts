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

const NOW = new Date(2026, 9, 15); // octobre 2026

describe("paymentsByMonth", () => {
  it("retourne les 6 derniers mois, mois courant inclus, dans l'ordre chronologique", () => {
    const months = paymentsByMonth([], NOW);
    expect(months.map((m) => m.key)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
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
        item([{ id: "p4", date: "2026-07-01", amount: 150, status: "paye", createdBy: "u1" }]),
      ],
      NOW,
    );
    const byKey = Object.fromEntries(months.map((m) => [m.key, m.amount]));
    expect(byKey["2026-10"]).toBe(500);
    expect(byKey["2026-09"]).toBe(0);
    expect(byKey["2026-07"]).toBe(150);
  });

  it("ignore les paiements plus anciens que 6 mois", () => {
    const months = paymentsByMonth(
      [item([{ id: "p1", date: "2026-03-01", amount: 999, status: "paye", createdBy: "u1" }])],
      NOW,
    );
    expect(months.reduce((s, m) => s + m.amount, 0)).toBe(0);
  });
});
