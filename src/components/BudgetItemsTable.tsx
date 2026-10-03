import { Link } from "react-router-dom";
import {
  BUDGET_ITEM_STATUS_BADGE_CLASSES,
  BUDGET_ITEM_STATUS_LABELS,
} from "../constants";
import {
  computeRealized,
  effectiveBudget,
  latestProgress,
  statusOf,
} from "../domain/budgetItems";
import { formatMad } from "../domain/money";
import type { BudgetItem } from "../types";

export interface BudgetItemsTableProps {
  title: string;
  items: BudgetItem[];
  addHref: string;
  emptyMessage?: string;
}

export function BudgetItemsTable({
  title,
  items,
  addHref,
  emptyMessage = "Aucune rubrique budgétaire pour le moment.",
}: BudgetItemsTableProps) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="ht-label">{title}</h2>
        <Link to={addHref} className="ht-btn-cta-sm" aria-label="Ajouter une rubrique">
          + Ajouter
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--ht-text-2)]">{emptyMessage}</p>
      ) : (
        <div className="ht-card overflow-x-auto rounded-[14px]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="ht-table-th">Désignation</th>
                <th className="ht-table-th">Budget initial</th>
                <th className="ht-table-th">Révisé</th>
                <th className="ht-table-th">Total paiements</th>
                <th className="ht-table-th">Reste à payer</th>
                <th className="ht-table-th hidden sm:table-cell">Avancement</th>
                <th className="ht-table-th">Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const budget = effectiveBudget(item);
                const realized = computeRealized(item);
                const remaining = budget - realized;
                const progress = latestProgress(item);
                const status = statusOf(item);

                return (
                  <tr key={item.id}>
                    <td className="ht-table-td">
                      <Link to={`/budget/${item.id}`} className="ht-link">
                        {item.title}
                      </Link>
                    </td>
                    <td className="ht-table-td whitespace-nowrap">
                      {formatMad(item.budgeted)}
                    </td>
                    <td className="ht-table-td whitespace-nowrap">
                      {item.revisedBudget != null
                        ? formatMad(item.revisedBudget)
                        : "—"}
                    </td>
                    <td className="ht-table-td whitespace-nowrap">
                      {formatMad(realized)}
                    </td>
                    <td
                      className={`ht-table-td whitespace-nowrap ${
                        remaining < 0 ? "font-semibold text-[var(--ht-danger)]" : ""
                      }`}
                    >
                      {formatMad(remaining)}
                    </td>
                    <td className="ht-table-td hidden whitespace-nowrap sm:table-cell">
                      {progress != null ? `${progress}%` : "—"}
                    </td>
                    <td className="ht-table-td">
                      <span className={BUDGET_ITEM_STATUS_BADGE_CLASSES[status]}>
                        {BUDGET_ITEM_STATUS_LABELS[status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
