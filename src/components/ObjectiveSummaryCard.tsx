import { Link } from "react-router-dom";
import { latestProgressAcrossItems, summarizeBudgetItems } from "../domain/budgetItems";
import { formatMad } from "../domain/money";
import { computeProgress } from "../domain/progress";
import type { BudgetItem, Objective, Task } from "../types";

export interface ObjectiveSummaryCardProps {
  objective: Objective;
  tasks: Task[];
  budgetItems?: BudgetItem[];
}

export function ObjectiveSummaryCard({
  objective,
  tasks,
  budgetItems = [],
}: ObjectiveSummaryCardProps) {
  const progress = computeProgress(tasks);
  const budget = summarizeBudgetItems(budgetItems);
  const remaining = budget.budgeted - budget.realized;
  const budgetProgress = latestProgressAcrossItems(budgetItems);

  return (
    <li className="ht-card p-[16px_18px]">
      <div className="flex items-center gap-2">
        <Link
          to={`/objectives/${objective.id}`}
          className="ht-title hover:underline"
        >
          {objective.title}
        </Link>
        {objective.visibility === "private" && (
          <span className="ht-pill ht-pill-neutral">Privé</span>
        )}
      </div>
      {objective.description && (
        <p className="mt-1 ht-desc">{objective.description}</p>
      )}
      <div className="mt-2.5">
        <div className="ht-track">
          <div
            className="ht-fill-ok"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--ht-text-3)]">
          {progress.done}/{progress.total} tâches terminées ({progress.percent} %)
        </p>
      </div>
      {budgetItems.length > 0 && (
        <>
          <dl className="mt-2.5 grid grid-cols-4 gap-1 border-t border-[var(--ht-divider)] pt-2.5 text-center">
            <div>
              <dt className="whitespace-nowrap text-[10px] text-[var(--ht-text-3)]">
                Budget
              </dt>
              <dd className="text-[13px] font-extrabold text-[var(--ht-text)]">
                {formatMad(budget.budgeted)}
              </dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-[10px] text-[var(--ht-text-3)]">
                Avanc.
              </dt>
              <dd className="text-[13px] font-extrabold text-[var(--ht-text)]">
                {budgetProgress != null ? `${budgetProgress} %` : "—"}
              </dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-[10px] text-[var(--ht-text-3)]">
                Payé
              </dt>
              <dd className="text-[13px] font-extrabold text-[var(--ht-text)]">
                {formatMad(budget.realized)}
              </dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-[10px] text-[var(--ht-text-3)]">
                Reste
              </dt>
              <dd
                className={`text-[13px] font-extrabold ${remaining < 0 ? "text-[var(--ht-danger)]" : "text-[var(--ht-text)]"}`}
              >
                {formatMad(remaining)}
              </dd>
            </div>
          </dl>
          {remaining < 0 && (
            <span className="ht-pill ht-pill-over mt-1">Dépassement</span>
          )}
        </>
      )}
    </li>
  );
}
