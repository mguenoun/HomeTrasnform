import { describe, expect, it } from "vitest";
import type { BudgetItem, BudgetPayment } from "../../types";
import {
  addPayment,
  computePlanned,
  computeRealized,
  defaultRemainingEstimate,
  effectiveBudget,
  forecastFinal,
  getWatchlist,
  removePayment,
  reviseForecast,
  statusOf,
  summarizeBudgetItems,
  updatePayment,
  variance,
} from "../budgetItems";

function makePayment(overrides: Partial<BudgetPayment> = {}): BudgetPayment {
  return {
    id: "p1",
    date: "2026-03-01",
    amount: 100,
    status: "paye",
    createdBy: "u1",
    ...overrides,
  };
}

function makeItem(overrides: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: "i1",
    title: "Carrelage salon",
    category: "materiaux",
    objectiveId: null,
    taskId: null,
    budgeted: 1000,
    forecastHistory: [],
    payments: [],
    createdBy: "u1",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("computeRealized / computePlanned", () => {
  it("ne somme que les paiements payés pour le réalisé", () => {
    const item = makeItem({
      payments: [
        makePayment({ id: "a", amount: 100, status: "paye" }),
        makePayment({ id: "b", amount: 50, status: "prevu" }),
        makePayment({ id: "c", amount: 30, status: "paye" }),
      ],
    });
    expect(computeRealized(item)).toBe(130);
    expect(computePlanned(item)).toBe(50);
  });
});

describe("effectiveBudget", () => {
  it("utilise le budget révisé s'il existe", () => {
    expect(effectiveBudget(makeItem({ budgeted: 1000, revisedBudget: 1200 }))).toBe(
      1200,
    );
  });

  it("retombe sur le budget initial sinon", () => {
    expect(effectiveBudget(makeItem({ budgeted: 1000 }))).toBe(1000);
  });
});

describe("defaultRemainingEstimate / forecastFinal / variance", () => {
  it("se base sur l'engagé quand il existe", () => {
    const item = makeItem({
      budgeted: 1000,
      committed: 1300,
      payments: [makePayment({ amount: 400, status: "paye" })],
    });
    expect(defaultRemainingEstimate(item)).toBe(900);
    expect(forecastFinal(item)).toBe(1300);
    expect(variance(item)).toBe(-300);
  });

  it("retombe sur le budget effectif sans engagement connu", () => {
    const item = makeItem({
      budgeted: 1000,
      payments: [makePayment({ amount: 400, status: "paye" })],
    });
    expect(defaultRemainingEstimate(item)).toBe(600);
    expect(forecastFinal(item)).toBe(1000);
  });

  it("ne descend jamais sous zéro même si le réalisé dépasse déjà la référence", () => {
    const item = makeItem({
      budgeted: 1000,
      payments: [makePayment({ amount: 1500, status: "paye" })],
    });
    expect(defaultRemainingEstimate(item)).toBe(0);
    expect(forecastFinal(item)).toBe(1500);
    expect(variance(item)).toBe(-500);
  });

  it("respecte une prévision corrigée manuellement plutôt que le calcul par défaut", () => {
    const item = makeItem({
      budgeted: 1000,
      remainingEstimate: 700,
      payments: [makePayment({ amount: 400, status: "paye" })],
    });
    expect(forecastFinal(item)).toBe(1100);
    expect(variance(item)).toBe(-100);
  });
});

describe("statusOf", () => {
  it('est "over" si le réalisé dépasse déjà le budget', () => {
    const item = makeItem({
      budgeted: 1000,
      payments: [makePayment({ amount: 1200, status: "paye" })],
    });
    expect(statusOf(item)).toBe("over");
  });

  it('est "watch" si la prévision dépasse le budget mais pas encore le réalisé', () => {
    const item = makeItem({
      budgeted: 1000,
      committed: 1100,
      payments: [makePayment({ amount: 200, status: "paye" })],
    });
    expect(statusOf(item)).toBe("watch");
  });

  it('est "ok" sinon', () => {
    const item = makeItem({
      budgeted: 1000,
      payments: [makePayment({ amount: 200, status: "paye" })],
    });
    expect(statusOf(item)).toBe("ok");
  });
});

describe("summarizeBudgetItems", () => {
  it("cumule budget, engagé, réalisé, prévision et écart sur toutes les rubriques", () => {
    const items = [
      makeItem({
        id: "a",
        budgeted: 1000,
        committed: 1100,
        payments: [makePayment({ amount: 200, status: "paye" })],
      }),
      makeItem({
        id: "b",
        budgeted: 500,
        payments: [makePayment({ amount: 500, status: "paye" })],
      }),
    ];
    expect(summarizeBudgetItems(items)).toEqual({
      budgeted: 1500,
      committed: 1100,
      realized: 700,
      forecast: 1600,
      variance: -100,
    });
  });
});

describe("getWatchlist", () => {
  it("ne retient que les rubriques en dépassement avéré ou prévu, triées de la pire à la moins pire", () => {
    const ok = makeItem({ id: "ok", budgeted: 1000 });
    const watch = makeItem({
      id: "watch",
      budgeted: 1000,
      committed: 1050,
    });
    const over = makeItem({
      id: "over",
      budgeted: 1000,
      payments: [makePayment({ amount: 1300, status: "paye" })],
    });
    expect(getWatchlist([ok, watch, over]).map((i) => i.id)).toEqual([
      "over",
      "watch",
    ]);
  });
});

describe("addPayment / updatePayment / removePayment", () => {
  it("ajoute un paiement à la liste existante", () => {
    const item = makeItem({ payments: [makePayment({ id: "a" })] });
    const next = addPayment(item, makePayment({ id: "b", amount: 50 }));
    expect(next.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("modifie uniquement le paiement visé", () => {
    const item = makeItem({
      payments: [
        makePayment({ id: "a", amount: 100 }),
        makePayment({ id: "b", amount: 50 }),
      ],
    });
    const next = updatePayment(item, "b", { amount: 75 });
    expect(next.find((p) => p.id === "a")?.amount).toBe(100);
    expect(next.find((p) => p.id === "b")?.amount).toBe(75);
  });

  it("supprime uniquement le paiement visé", () => {
    const item = makeItem({
      payments: [makePayment({ id: "a" }), makePayment({ id: "b" })],
    });
    expect(removePayment(item, "a").map((p) => p.id)).toEqual(["b"]);
  });
});

describe("reviseForecast", () => {
  it("historise la valeur précédente (par défaut) et la nouvelle valeur", () => {
    const item = makeItem({
      budgeted: 1000,
      payments: [makePayment({ amount: 400, status: "paye" })],
    });
    const result = reviseForecast(item, 800, "Devis électricien plus élevé", "u1", 123);
    expect(result.remainingEstimate).toBe(800);
    expect(result.forecastHistory).toEqual([
      {
        date: 123,
        previousEstimate: 600,
        newEstimate: 800,
        comment: "Devis électricien plus élevé",
        userId: "u1",
      },
    ]);
  });

  it("part de la précédente révision si elle existe déjà", () => {
    const item = makeItem({
      budgeted: 1000,
      remainingEstimate: 500,
      forecastHistory: [
        { date: 1, previousEstimate: 600, newEstimate: 500, userId: "u1" },
      ],
    });
    const result = reviseForecast(item, 300, undefined, "u2", 456);
    expect(result.forecastHistory).toHaveLength(2);
    expect(result.forecastHistory[1]).toEqual({
      date: 456,
      previousEstimate: 500,
      newEstimate: 300,
      comment: undefined,
      userId: "u2",
    });
  });
});
