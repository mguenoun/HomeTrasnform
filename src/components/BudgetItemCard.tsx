import { Link } from "react-router-dom";
import { BUDGET_CATEGORY_LABELS } from "../constants";
import {
  computeRealized,
  effectiveBudget,
  forecastFinal,
  statusOf,
  variance,
} from "../domain/budgetItems";
import { formatMad } from "../domain/money";
import type { BudgetItem } from "../types";

const STATUS_BADGE: Record<string, string> = {
  over: "bg-red-100 text-red-700",
  watch: "bg-orange-100 text-orange-700",
  ok: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  over: "Dépassé",
  watch: "À surveiller",
  ok: "Dans les clous",
};

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
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            to={`/budget/${item.id}`}
            className="font-medium text-blue-700 hover:underline"
          >
            {item.title}
          </Link>
          <p className="text-xs text-slate-500">
            {BUDGET_CATEGORY_LABELS[item.category]}
            {item.vendor && ` · ${item.vendor}`}
            {objectiveTitle && ` · ${objectiveTitle}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full rounded bg-slate-200">
          <div
            className={`h-2 rounded ${status === "over" ? "bg-red-500" : "bg-blue-500"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {formatMad(realized)} réalisé / {formatMad(budget)} budgété
        </p>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Prévision {formatMad(forecastFinal(item))}
        {variance(item) < 0 && (
          <span className="ml-1 font-medium text-red-700">
            ({formatMad(variance(item))})
          </span>
        )}
      </p>
    </div>
  );
}
