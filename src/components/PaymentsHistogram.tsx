import { paymentsByMonth } from "../domain/payments";
import { formatAmount } from "../domain/money";
import type { BudgetItem } from "../types";

export interface PaymentsHistogramProps {
  items: BudgetItem[];
  now?: Date;
}

export function PaymentsHistogram({ items, now }: PaymentsHistogramProps) {
  const months = paymentsByMonth(items, now);
  const max = Math.max(...months.map((m) => m.amount), 0);
  const total = months.reduce((sum, m) => sum + m.amount, 0);

  return (
    <section>
      <h2 className="mb-2.5 ht-label">Paiements effectués par mois</h2>
      <div className="ht-card p-4">
        {total === 0 ? (
          <p className="text-sm text-[var(--ht-text-2)]">
            Aucun paiement effectué sur les 6 derniers mois.
          </p>
        ) : (
          <div
            role="img"
            aria-label={`Paiements effectués par mois : ${months
              .map((m) => `${m.label} ${formatAmount(m.amount)} MAD`)
              .join(", ")}`}
            className="flex h-[140px] items-end gap-2"
          >
            {months.map((m) => {
              const height = max > 0 ? (m.amount / max) * 100 : 0;
              return (
                <div
                  key={m.key}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[10px] font-bold text-[var(--ht-text-2)]">
                    {m.amount > 0 ? formatAmount(m.amount) : ""}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="ht-fill-grad w-full rounded-t-md rounded-b-none"
                      style={{ height: `${height}%`, minHeight: m.amount > 0 ? 4 : 0 }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--ht-text-3)]">{m.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
