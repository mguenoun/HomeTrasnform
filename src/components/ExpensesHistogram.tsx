import { expensesByMonth } from "../domain/expenses";
import { formatMad } from "../domain/money";
import type { HouseholdExpense } from "../types";

/** Dépenses des six derniers mois, courses et ménage empilés. */
export function ExpensesHistogram({
  expenses,
  now,
}: {
  expenses: HouseholdExpense[];
  now?: Date;
}) {
  const months = expensesByMonth(expenses, now);
  const max = Math.max(...months.map((m) => m.total), 0);
  const total = months.reduce((sum, m) => sum + m.total, 0);

  return (
    <section className="ht-card p-4" aria-label="Dépenses par mois">
      <h3 className="mb-2 text-sm font-extrabold text-[var(--ht-text)]">
        Dépenses par mois
      </h3>
      {total === 0 ? (
        <p className="text-sm text-[var(--ht-text-2)]">
          Aucune dépense sur les 6 derniers mois.
        </p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Dépenses par mois : ${months
              .map((m) => `${m.label} ${formatMad(m.total)}`)
              .join(", ")}`}
            className="flex h-[140px] items-end gap-2"
          >
            {months.map((m) => (
              <div
                key={m.key}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="text-[10px] font-bold text-[var(--ht-text-2)]">
                  {m.total > 0 ? Math.round(m.total) : ""}
                </span>
                <div className="flex w-full flex-1 flex-col-reverse">
                  <div
                    className="ht-fill-grad w-full"
                    style={{
                      height: max > 0 ? `${(m.groceries / max) * 100}%` : 0,
                      minHeight: m.groceries > 0 ? 3 : 0,
                    }}
                  />
                  <div
                    className="w-full rounded-t-md bg-[var(--ht-text-3)]"
                    style={{
                      height: max > 0 ? `${(m.helper / max) * 100}%` : 0,
                      minHeight: m.helper > 0 ? 3 : 0,
                    }}
                  />
                </div>
                <span className="text-[10px] text-[var(--ht-text-3)]">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-[var(--ht-text-2)]">
            Courses (couleur) · Ménage (gris, au-dessus)
          </p>
          <ul className="mt-2 text-sm text-[var(--ht-text)]">
            {[...months]
              .reverse()
              .filter((m) => m.total > 0)
              .map((m) => (
                <li key={m.key} className="flex justify-between gap-2 py-0.5">
                  <span>
                    {m.label} {m.key.slice(0, 4)}
                  </span>
                  <span className="text-right">
                    {formatMad(m.total)}
                    <span className="block text-xs text-[var(--ht-text-2)]">
                      courses {formatMad(m.groceries)} · ménage {formatMad(m.helper)}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}
