import { describe, expect, it } from "vitest";
import type { HouseholdExpense } from "../../types";
import { sumItemPrices, summarizeExpenses, toDateInputValue } from "../expenses";

const expense = (
  over: Partial<HouseholdExpense> & Pick<HouseholdExpense, "type" | "amount">,
): HouseholdExpense => ({
  id: Math.random().toString(),
  date: "2026-11-21",
  weekId: "2026-11-21",
  createdBy: "u",
  createdAt: 1,
  ...over,
});

describe("summarizeExpenses", () => {
  it("sépare courses et honoraires", () => {
    const summary = summarizeExpenses([
      expense({ type: "groceries", amount: 300, vendor: "Boucher" }),
      expense({ type: "helper", amount: 200 }),
      expense({ type: "helper", amount: 200 }),
    ]);
    expect(summary).toMatchObject({ total: 700, groceries: 300, helper: 400 });
  });

  it("cumule plusieurs paiements chez le même point de vente (lait payé plus tard)", () => {
    const summary = summarizeExpenses([
      expense({ type: "groceries", amount: 361, vendor: "Épicier" }),
      expense({ type: "groceries", amount: 26, vendor: "Épicier", date: "2026-11-22" }),
      expense({ type: "groceries", amount: 300, vendor: "Boucher" }),
    ]);
    expect(summary.byVendor).toEqual([
      { vendor: "Épicier", total: 387, payments: 2 },
      { vendor: "Boucher", total: 300, payments: 1 },
    ]);
  });

  it("renvoie des totaux à zéro sans dépense", () => {
    expect(summarizeExpenses([])).toEqual({
      total: 0,
      groceries: 0,
      helper: 0,
      byVendor: [],
    });
  });

  it("retrouve le total réel de la semaine du 21 novembre (courses seules)", () => {
    const amounts = [84, 361, 26, 187, 72, 300, 250, 50, 125];
    const summary = summarizeExpenses(
      amounts.map((amount) => expense({ type: "groceries", amount, vendor: "x" })),
    );
    expect(summary.groceries).toBe(1455);
  });
});

describe("sumItemPrices", () => {
  it("ignore les articles sans prix", () => {
    expect(
      sumItemPrices([
        { id: "a", name: "a", price: 12.5, checked: false, createdAt: 1 },
        { id: "b", name: "b", checked: false, createdAt: 2 },
      ]),
    ).toBe(12.5);
  });
});

describe("toDateInputValue", () => {
  it("formate en heure locale, sans décalage UTC", () => {
    expect(toDateInputValue(new Date(2026, 10, 21, 0, 30))).toBe("2026-11-21");
    expect(toDateInputValue(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
