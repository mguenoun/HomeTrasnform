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
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-400">
          {title}
        </h2>
        <Link
          to={addHref}
          className="rounded bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 px-3 py-1 text-sm font-medium text-slate-950 hover:brightness-105"
        >
          Ajouter une rubrique
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-white/10 dark:text-slate-500">
                <th className="p-3 font-medium">Désignation</th>
                <th className="p-3 font-medium">Budget initial</th>
                <th className="p-3 font-medium">Révisé</th>
                <th className="p-3 font-medium">Total paiements</th>
                <th className="p-3 font-medium">Reste à payer</th>
                <th className="hidden p-3 font-medium sm:table-cell">
                  Avancement
                </th>
                <th className="p-3 font-medium">Statut</th>
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
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.04]"
                  >
                    <td className="p-3">
                      <Link
                        to={`/budget/${item.id}`}
                        className="font-medium text-blue-700 hover:underline dark:text-sky-400"
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td className="p-3 whitespace-nowrap dark:text-slate-200">
                      {formatMad(item.budgeted)}
                    </td>
                    <td className="p-3 whitespace-nowrap dark:text-slate-200">
                      {item.revisedBudget != null
                        ? formatMad(item.revisedBudget)
                        : "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap dark:text-slate-200">
                      {formatMad(realized)}
                    </td>
                    <td
                      className={`p-3 whitespace-nowrap font-medium ${
                        remaining < 0
                          ? "text-red-700 dark:text-red-400"
                          : "text-slate-900 dark:text-slate-50"
                      }`}
                    >
                      {formatMad(remaining)}
                    </td>
                    <td className="hidden p-3 whitespace-nowrap dark:text-slate-200 sm:table-cell">
                      {progress != null ? `${progress}%` : "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${BUDGET_ITEM_STATUS_BADGE_CLASSES[status]}`}
                      >
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
