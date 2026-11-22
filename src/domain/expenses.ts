import type { HouseholdExpense, ShoppingItem } from "../types";

export interface ExpenseSummary {
  total: number;
  groceries: number;
  helper: number;
  /** Total des courses par point de vente (plusieurs paiements cumulés). */
  byVendor: Array<{ vendor: string; total: number; payments: number }>;
}

export function summarizeExpenses(expenses: HouseholdExpense[]): ExpenseSummary {
  let groceries = 0;
  let helper = 0;
  const byVendor = new Map<string, { total: number; payments: number }>();

  for (const expense of expenses) {
    if (expense.type === "helper") {
      helper += expense.amount;
      continue;
    }
    groceries += expense.amount;
    const vendor = expense.vendor ?? "";
    const entry = byVendor.get(vendor) ?? { total: 0, payments: 0 };
    entry.total += expense.amount;
    entry.payments += 1;
    byVendor.set(vendor, entry);
  }

  return {
    total: groceries + helper,
    groceries,
    helper,
    byVendor: [...byVendor.entries()]
      .map(([vendor, v]) => ({ vendor, ...v }))
      .sort((a, b) => b.total - a.total),
  };
}

/** Somme des prix saisis par article (détail facultatif, pas la source de vérité). */
export function sumItemPrices(items: ShoppingItem[]): number {
  return items.reduce((sum, item) => sum + (item.price ?? 0), 0);
}

/** "YYYY-MM-DD" en heure locale (jamais toISOString : décalage UTC). */
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
