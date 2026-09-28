import { Link } from "react-router-dom";
import { summarizeBudgetItems } from "../domain/budgetItems";
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

  return (
    <li className="rounded border border-slate-200 bg-white p-4">
      <Link
        to={`/objectives/${objective.id}`}
        className="text-lg font-medium text-blue-700 hover:underline"
      >
        {objective.title}
      </Link>
      {objective.description && (
        <p className="mt-1 text-sm text-slate-600">{objective.description}</p>
      )}
      <div className="mt-3">
        <div className="h-2 w-full rounded bg-slate-200">
          <div
            className="h-2 rounded bg-green-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {progress.done}/{progress.total} tâches terminées (
          {progress.percent}%)
        </p>
      </div>
      {budgetItems.length > 0 && (
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span>
            Budget : {formatMad(budget.realized)} / {formatMad(budget.budgeted)}
          </span>
          {budget.realized > budget.budgeted && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700">
              Dépassement
            </span>
          )}
        </p>
      )}
    </li>
  );
}
