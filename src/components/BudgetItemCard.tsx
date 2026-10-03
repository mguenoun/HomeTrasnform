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
    <div className="ht-card p-[16px_18px]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link to={`/budget/${item.id}`} className="ht-title hover:underline">
            {item.title}
          </Link>
          <p className="text-[11px] text-[var(--ht-text-3)]">
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

      <div className="mt-2.5">
        <div className="ht-track">
          <div
            className={status === "over" ? "ht-fill-ok" : "ht-fill-grad"}
            style={{
              width: `${percent}%`,
              ...(status === "over" ? { background: "var(--ht-danger)" } : {}),
            }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--ht-text-3)]">
          {formatMad(realized)} réalisé / {formatMad(budget)} budgété
        </p>
      </div>

      <p className="mt-1.5 text-[11px] text-[var(--ht-text-3)]">
        Prévision {formatMad(forecastFinal(item))}
        {variance(item) < 0 && (
          <span className="ml-1 font-semibold text-[var(--ht-danger)]">
            ({formatMad(variance(item))})
          </span>
        )}
      </p>
    </div>
  );
}
