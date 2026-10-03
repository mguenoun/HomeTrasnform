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
import { formatAmount } from "../domain/money";
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
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr>
                <th className="ht-table-th w-[34%]">Désignation</th>
                <th className="ht-table-th">Budget (MAD)</th>
                <th className="ht-table-th">Payé (MAD)</th>
                <th className="ht-table-th">Reste (MAD)</th>
                <th className="ht-table-th">Avanc.</th>
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
                    <td className="ht-table-td">
                      {formatAmount(budget)}
                    </td>
                    <td className="ht-table-td">
                      {formatAmount(realized)}
                    </td>
                    <td
                      className={`ht-table-td ${
                        remaining < 0 ? "font-semibold text-[var(--ht-danger)]" : ""
                      }`}
                    >
                      {formatAmount(remaining)}
                    </td>
                    <td className="ht-table-td">
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
