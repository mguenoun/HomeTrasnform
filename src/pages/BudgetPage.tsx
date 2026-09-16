import { Link } from "react-router-dom";
import { Breadcrumb } from "../components/Breadcrumb";
import { TASK_TYPE_LABELS } from "../constants";
import {
  groupBudgetByObjective,
  groupBudgetByType,
  summarizeBudget,
  type BudgetSummary,
} from "../domain/budget";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";
import type { TaskType } from "../types";

function BudgetRow({
  label,
  summary,
  to,
}: {
  label: string;
  summary: BudgetSummary;
  to?: string;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-white p-3">
      <span className="font-medium text-slate-900">{label}</span>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span>
          {summary.actual.toFixed(2)} MAD / {summary.estimated.toFixed(2)} MAD
          engagés
        </span>
        {summary.overBudget && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Dépassement
          </span>
        )}
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block hover:bg-slate-50">
      {content}
    </Link>
  ) : (
    content
  );
}

export function BudgetPage() {
  const { tasks, loading } = useTasks();
  const { objectives } = useObjectives();

  const global = summarizeBudget(tasks);
  const byObjective = groupBudgetByObjective(tasks);
  const byType = groupBudgetByType(tasks);

  const objectiveTitleById = new Map(objectives.map((o) => [o.id, o.title]));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Breadcrumb
        items={[{ label: "Tableau de bord", to: "/" }, { label: "Budget" }]}
      />
      <h1 className="mt-4 mb-6 text-xl font-semibold text-slate-900">
        Budget
      </h1>

      {loading && <p className="text-slate-500">Chargement...</p>}

      {!loading && (
        <>
          <div className="mb-6 rounded border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-700">
              Vue d'ensemble
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {global.actual.toFixed(2)} MAD{" "}
              <span className="text-base font-normal text-slate-500">
                dépensés / {global.estimated.toFixed(2)} MAD engagés
              </span>
            </p>
            {global.overBudget && (
              <span className="mt-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Au moins une tâche dépasse son budget estimé
              </span>
            )}
          </div>

          <section className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-slate-700">
              Par objectif
            </h2>
            <div className="flex flex-col gap-2">
              {Object.entries(byObjective).map(([objectiveId, summary]) => (
                <BudgetRow
                  key={objectiveId}
                  label={
                    objectiveId === "unassigned"
                      ? "Tâches libres"
                      : (objectiveTitleById.get(objectiveId) ?? objectiveId)
                  }
                  summary={summary}
                  to={
                    objectiveId === "unassigned"
                      ? undefined
                      : `/objectives/${objectiveId}`
                  }
                />
              ))}
              {Object.keys(byObjective).length === 0 && (
                <p className="text-sm text-slate-500">Aucune tâche.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-slate-700">
              Par type de tâche
            </h2>
            <div className="flex flex-col gap-2">
              {Object.entries(byType).map(([type, summary]) => (
                <BudgetRow
                  key={type}
                  label={TASK_TYPE_LABELS[type as TaskType]}
                  summary={summary}
                />
              ))}
              {Object.keys(byType).length === 0 && (
                <p className="text-sm text-slate-500">Aucune tâche.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
