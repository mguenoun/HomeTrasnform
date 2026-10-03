import type { BudgetItem } from "../types";

const MONTH_LABELS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

export interface MonthlyPayments {
  key: string;
  label: string;
  amount: number;
}

/**
 * Montant des paiements effectués (statut "paye") par mois, sur les `months`
 * derniers mois calendaires, mois courant inclus. Les mois sans paiement
 * restent présents (montant 0) pour garder un axe régulier.
 */
export function paymentsByMonth(
  items: BudgetItem[],
  now: Date = new Date(),
  months = 6,
): MonthlyPayments[] {
  const buckets: MonthlyPayments[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    buckets.push({
      key: `${d.getFullYear()}-${month}`,
      label: MONTH_LABELS[d.getMonth()],
      amount: 0,
    });
  }

  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const item of items) {
    for (const payment of item.payments) {
      if (payment.status !== "paye") continue;
      const bucket = byKey.get(payment.date.slice(0, 7));
      if (bucket) bucket.amount += payment.amount;
    }
  }
  return buckets;
}
