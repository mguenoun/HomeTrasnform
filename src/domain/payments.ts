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

/** Premier mois affiché : l'historique des paiements commence en septembre 2026. */
export const PAYMENTS_HISTOGRAM_START = new Date(2026, 8, 1);

export interface MonthlyPayments {
  key: string;
  label: string;
  amount: number;
}

/**
 * Montant des paiements effectués (statut "paye") par mois.
 * Affiche au plus `months` mois, en remontant depuis le mois courant, sans
 * jamais remonter avant `start` (septembre 2026 par défaut). Les mois sans
 * paiement restent présents (montant 0) pour garder un axe régulier.
 */
export function paymentsByMonth(
  items: BudgetItem[],
  now: Date = new Date(),
  months = 6,
  start: Date = PAYMENTS_HISTOGRAM_START,
): MonthlyPayments[] {
  const endIndex = now.getFullYear() * 12 + now.getMonth();
  const startIndex = Math.max(
    endIndex - (months - 1),
    start.getFullYear() * 12 + start.getMonth(),
  );

  const buckets: MonthlyPayments[] = [];
  for (let index = startIndex; index <= endIndex; index++) {
    const year = Math.floor(index / 12);
    const month = index % 12;
    buckets.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[month],
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
