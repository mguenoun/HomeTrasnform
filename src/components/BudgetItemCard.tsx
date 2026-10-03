import { Link } from "react-router-dom";
import {
  BUDGET_CATEGORY_LABELS,
  BUDGET_ITEM_STATUS_BADGE_CLASSES,
  BUDGET_ITEM_STATUS_LABELS,
} from "../constants";
import {
  computeRealized,
  effectiveBudget,
  forecastFinal,
  statusOf,
  variance,
} from "../domain/budgetItems";
import { formatMad } from "../domain/money";
import type { BudgetItem } from "../types";

export interface BudgetItemCardProps {
  item: BudgetItem;
  objectiveTitle?: string;
}

export function BudgetItemCard({ item, objectiveTitle }: BudgetItemCardProps) {
  const budget = effectiveBudget(item);
  const realized = computeRealized(item);
  const status = statusOf(item);
  const percent = budget > 0 ? Math.min(100, Math.round((realized / budget) * 100)) : 0;

  return (
    <div className="rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            to={`/budget/${item.id}`}
            className="font-medium text-slate-900 hover:underline dark:text-slate-50"
          >
            {item.title}
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {BUDGET_CATEGORY_LABELS[item.category]}
            {item.vendor && ` · ${item.vendor}`}
            {objectiveTitle && ` · ${objectiveTitle}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${BUDGET_ITEM_STATUS_BADGE_CLASSES[status]}`}
        >
          {BUDGET_ITEM_STATUS_LABELS[status]}
        </span>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full rounded bg-slate-200 dark:bg-white/10">
          <div
            className={`h-2 rounded ${status === "over" ? "bg-red-500" : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {formatMad(realized)} réalisé / {formatMad(budget)} budgété
        </p>
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Prévision {formatMad(forecastFinal(item))}
        {variance(item) < 0 && (
          <span className="ml-1 font-medium text-red-700 dark:text-red-400">
            ({formatMad(variance(item))})
          </span>
        )}
      </p>
    </div>
  );
}
