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
      className="ht-row flex flex-col gap-1 p-[12px_14px] hover:brightness-[1.03]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 ht-title text-[13px]">
          {task.title}
          {isPrivate && <span className="ht-pill ht-pill-neutral">Privé</span>}
        </span>
        <span className="shrink-0 text-[11px] text-[var(--ht-text-3)]">{meta}</span>
      </div>
      {budgetItems.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--ht-text-3)]">
          <span>Budget {formatMad(budget.budgeted)}</span>
          {progress != null && <span>Avancement {progress}%</span>}
          <span>Payé {formatMad(budget.realized)}</span>
          <span
            className={
              remaining < 0 ? "font-semibold text-[var(--ht-danger)]" : ""
            }
          >
            Reste {formatMad(remaining)}
          </span>
        </div>
      )}
    </Link>
  );
}
