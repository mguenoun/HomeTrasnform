import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { latestProgressAcrossItems, summarizeBudgetItems } from "../domain/budgetItems";
import { formatMad } from "../domain/money";
import type { BudgetItem, Task } from "../types";

export interface TaskRowProps {
  task: Task;
  meta: ReactNode;
  budgetItems?: BudgetItem[];
  isPrivate?: boolean;
}

export function TaskRow({
  task,
  meta,
  budgetItems = [],
  isPrivate = false,
}: TaskRowProps) {
  const budget = summarizeBudgetItems(budgetItems);
  const remaining = budget.budgeted - budget.realized;
  const progress = latestProgressAcrossItems(budgetItems);

  return (
    <Link
      to={`/tasks/${task.id}`}
      className="flex flex-col gap-1 rounded border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-50">
          {task.title}
          {isPrivate && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
              Privé
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
          {meta}
        </span>
      </div>
      {budgetItems.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
          <span>Budget {formatMad(budget.budgeted)}</span>
          {progress != null && <span>Avancement {progress}%</span>}
          <span>Payé {formatMad(budget.realized)}</span>
          <span
            className={
              remaining < 0 ? "font-medium text-red-700 dark:text-red-400" : ""
            }
          >
            Reste {formatMad(remaining)}
          </span>
        </div>
      )}
    </Link>
  );
}
