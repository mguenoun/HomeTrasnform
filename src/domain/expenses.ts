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

/** Total payé pour un passage précis chez un point de vente. */
export function paidFor(
  expenses: HouseholdExpense[],
  vendor: string,
  round: number,
): { total: number; payments: number } {
  let total = 0;
  let payments = 0;
  for (const expense of expenses) {
    if (
      expense.type === "groceries" &&
      (expense.vendor ?? "") === vendor &&
      (expense.round && expense.round > 1 ? expense.round : 1) === round
    ) {
      total += expense.amount;
      payments += 1;
    }
  }
  return { total, payments };
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

export interface MonthExpenses {
  /** "YYYY-MM". */
  key: string;
  label: string;
  groceries: number;
  helper: number;
  total: number;
}

const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "short" });

/**
 * Dépenses des `count` derniers mois (mois courant inclus), du plus ancien au plus
 * récent. Un mois sans dépense apparaît à zéro pour que l'échelle de temps reste régulière.
 */
export function expensesByMonth(
  expenses: HouseholdExpense[],
  now: Date = new Date(),
  count = 6,
): MonthExpenses[] {
  const months: MonthExpenses[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: MONTH_LABEL.format(date).replace(".", ""),
      groceries: 0,
      helper: 0,
      total: 0,
    });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const expense of expenses) {
    const month = byKey.get(expense.date.slice(0, 7));
    if (!month) continue;
    if (expense.type === "helper") month.helper += expense.amount;
    else month.groceries += expense.amount;
    month.total += expense.amount;
  }
  return months;
}

/** Jours habituels de la personne de ménage : samedi, mardi et jeudi. */
export const HELPER_USUAL_DAYS = ["sat", "tue", "thu"] as const;

/**
 * Jours habituels déjà passés (aujourd'hui compris) de la semaine, sans paiement de la
 * personne de ménage à cette date : à proposer d'enregistrer d'un tap.
 */
export function missingHelperDays<T extends { key: string; date: Date }>(
  expenses: HouseholdExpense[],
  days: T[],
  today: Date = new Date(),
): T[] {
  const todayIso = toDateInputValue(today);
  const paid = new Set(
    expenses.filter((e) => e.type === "helper").map((e) => e.date),
  );
  return days.filter((day) => {
    const iso = toDateInputValue(day.date);
    return (
      (HELPER_USUAL_DAYS as readonly string[]).includes(day.key) &&
      iso <= todayIso &&
      !paid.has(iso)
    );
  });
}
