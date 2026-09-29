import type { BudgetForecastRevision, BudgetItem, BudgetPayment } from "../types";

export function computeRealized(item: BudgetItem): number {
  return item.payments
    .filter((p) => p.status === "paye")
    .reduce((sum, p) => sum + p.amount, 0);
}

export function computePlanned(item: BudgetItem): number {
  return item.payments
    .filter((p) => p.status === "prevu")
    .reduce((sum, p) => sum + p.amount, 0);
}

/** Budget de référence pour les calculs courants : révisé s'il existe, sinon initial. */
export function effectiveBudget(item: BudgetItem): number {
  return item.revisedBudget ?? item.budgeted;
}

/**
 * Reste à prévoir par défaut, tant que personne ne l'a corrigé manuellement :
 * ce qui a été engagé (ou le budget faute d'engagement connu), moins ce qui
 * a déjà été réalisé.
 */
export function defaultRemainingEstimate(item: BudgetItem): number {
  const reference = item.committed ?? effectiveBudget(item);
  return Math.max(0, reference - computeRealized(item));
}

export function forecastFinal(item: BudgetItem): number {
  const remaining = item.remainingEstimate ?? defaultRemainingEstimate(item);
  return computeRealized(item) + remaining;
}

/** Positif : marge restante. Négatif : dépassement (prévu ou avéré). */
export function variance(item: BudgetItem): number {
  return effectiveBudget(item) - forecastFinal(item);
}

export type BudgetItemStatus = "over" | "watch" | "ok";

export function statusOf(item: BudgetItem): BudgetItemStatus {
  const budget = effectiveBudget(item);
  if (computeRealized(item) > budget) return "over";
  if (forecastFinal(item) > budget) return "watch";
  return "ok";
}

export interface BudgetTotals {
  budgeted: number;
  committed: number;
  realized: number;
  forecast: number;
  variance: number;
}

export function summarizeBudgetItems(items: BudgetItem[]): BudgetTotals {
  return items.reduce<BudgetTotals>(
    (acc, item) => ({
      budgeted: acc.budgeted + effectiveBudget(item),
      committed: acc.committed + (item.committed ?? 0),
      realized: acc.realized + computeRealized(item),
      forecast: acc.forecast + forecastFinal(item),
      variance: acc.variance + variance(item),
    }),
    { budgeted: 0, committed: 0, realized: 0, forecast: 0, variance: 0 },
  );
}

/** Rubriques à surveiller (dépassement avéré ou prévu), les pires en premier. */
export function getWatchlist(items: BudgetItem[]): BudgetItem[] {
  return items
    .filter((item) => statusOf(item) !== "ok")
    .sort((a, b) => variance(a) - variance(b));
}

/** Avancement du paiement le plus récent qui en renseigne un, sinon aucun. */
export function latestProgress(item: BudgetItem): number | null {
  const withProgress = item.payments.filter((p) => p.progress != null);
  if (withProgress.length === 0) return null;
  const latest = [...withProgress].sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest.progress ?? null;
}

export function addPayment(
  item: BudgetItem,
  payment: BudgetPayment,
): BudgetPayment[] {
  return [...item.payments, payment];
}

export function updatePayment(
  item: BudgetItem,
  paymentId: string,
  changes: Partial<Omit<BudgetPayment, "id">>,
): BudgetPayment[] {
  return item.payments.map((p) =>
    p.id === paymentId ? { ...p, ...changes } : p,
  );
}

export function removePayment(item: BudgetItem, paymentId: string): BudgetPayment[] {
  return item.payments.filter((p) => p.id !== paymentId);
}

export function reviseForecast(
  item: BudgetItem,
  newEstimate: number,
  comment: string | undefined,
  userId: string,
  now: number = Date.now(),
): { remainingEstimate: number; forecastHistory: BudgetForecastRevision[] } {
  const previousEstimate = item.remainingEstimate ?? defaultRemainingEstimate(item);
  return {
    remainingEstimate: newEstimate,
    forecastHistory: [
      ...item.forecastHistory,
      { date: now, previousEstimate, newEstimate, comment, userId },
    ],
  };
}
