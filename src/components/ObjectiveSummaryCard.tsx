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
    <li className="rounded border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Link
          to={`/objectives/${objective.id}`}
          className="text-lg font-medium text-blue-700 hover:underline"
        >
          {objective.title}
        </Link>
        {objective.visibility === "private" && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
            Privé
          </span>
        )}
      </div>
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
        <>
          <dl className="mt-3 grid grid-cols-4 gap-1 text-center">
            <div>
              <dt className="whitespace-nowrap text-xs text-slate-500">
                Budget
              </dt>
              <dd className="text-sm font-semibold text-slate-900">
                {formatMad(budget.budgeted)}
              </dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-xs text-slate-500">
                Avancement
              </dt>
              <dd className="text-sm font-semibold text-slate-900">
                {budgetProgress != null ? `${budgetProgress}%` : "—"}
              </dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-xs text-slate-500">Payé</dt>
              <dd className="text-sm font-semibold text-slate-900">
                {formatMad(budget.realized)}
              </dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-xs text-slate-500">
                Reste
              </dt>
              <dd
                className={`text-sm font-semibold ${remaining < 0 ? "text-red-700" : "text-slate-900"}`}
              >
                {formatMad(remaining)}
              </dd>
            </div>
          </dl>
          {remaining < 0 && (
            <span className="mt-1 inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
              Dépassement
            </span>
          )}
        </>
      )}
    </li>
  );
}
