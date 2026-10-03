import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "../components/Breadcrumb";
import { BudgetItemsTable } from "../components/BudgetItemsTable";
import { ObjectiveForm, type ObjectiveFormValues } from "../components/ObjectiveForm";
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS } from "../constants";
import { computeProgress } from "../domain/progress";
import { useBudgetItems } from "../hooks/useBudgetItems";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";
import {
  deleteObjective,
  setObjectiveStatus,
  updateObjective,
} from "../services/objectives";

export function ObjectiveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { objectives } = useObjectives();
  const { tasks } = useTasks();
  const { items: budgetItems } = useBudgetItems();
  const [editing, setEditing] = useState(false);

  const objective = objectives.find((o) => o.id === id);
  const objectiveTasks = tasks.filter((t) => t.objectiveId === id);
  const objectiveBudgetItems = budgetItems.filter((b) => b.objectiveId === id);
  const progress = computeProgress(objectiveTasks);

  if (!objective) {
    return (
      <div className="p-6 dark:bg-[#0c1628] dark:text-slate-100">
        <p className="text-slate-500 dark:text-slate-400">
          Objectif introuvable.
        </p>
        <Link
          to="/objectives"
          className="text-blue-700 hover:underline dark:text-sky-400"
        >
          Retour aux objectifs
        </Link>
      </div>
    );
  }

  async function handleUpdate(values: ObjectiveFormValues) {
    if (!id) return;
    await updateObjective(id, {
      title: values.title,
      description: values.description,
      targetDate: values.targetDate || null,
      visibility: values.visibility,
    });
    setEditing(false);
  }

  async function handleArchive() {
    if (!id || !objective) return;
    await setObjectiveStatus(
      id,
      objective.status === "active" ? "archived" : "active",
    );
  }

  async function handleDelete() {
    if (!id) return;
    if (
      !window.confirm(
        "Supprimer cet objectif ? Les tâches liées deviendront des tâches libres.",
      )
    ) {
      return;
    }
    await deleteObjective(id);
    navigate("/objectives");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-[radial-gradient(circle_at_18%_-10%,#16243f_0%,#0c1628_45%,#020408_100%)]">
      <Breadcrumb
        items={[
          { label: "Tableau de bord", to: "/" },
          { label: "Objectifs", to: "/objectives" },
          { label: objective.title },
        ]}
      />

      {editing ? (
        <div className="mt-4 max-w-md rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <ObjectiveForm
            initialValues={{
              title: objective.title,
              description: objective.description ?? "",
              targetDate: objective.targetDate ?? "",
              visibility: objective.visibility ?? "shared",
            }}
            submitLabel="Enregistrer"
            onSubmit={handleUpdate}
          />
        </div>
      ) : (
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {objective.title}
            </h1>
            {objective.visibility === "private" && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                Privé
              </span>
            )}
          </div>
          {objective.description && (
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              {objective.description}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Éditer
            </button>
            <button
              type="button"
              onClick={handleArchive}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {objective.status === "active" ? "Archiver" : "Réactiver"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15"
            >
              Supprimer
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {progress.done}/{progress.total} tâches terminées ({progress.percent}
            %)
          </p>
        </header>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-50">
          Tâches
        </h2>
        <Link
          to={`/tasks/new?objectiveId=${id}`}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 dark:bg-gradient-to-r dark:from-amber-400 dark:via-orange-500 dark:to-red-500 dark:text-slate-950 dark:hover:brightness-105"
        >
          Ajouter une tâche
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {objectiveTasks.map((task) => (
          <li key={task.id}>
            <Link
              to={`/tasks/${task.id}`}
              className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
            >
              <span className="dark:text-slate-50">{task.title}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {TASK_TYPE_LABELS[task.type]} · {TASK_STATUS_LABELS[task.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {objectiveTasks.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">
          Aucune tâche rattachée pour le moment.
        </p>
      )}

      <div className="mt-6">
        <BudgetItemsTable
          title="Rubriques budgétaires"
          items={objectiveBudgetItems}
          addHref={`/budget/new?objectiveId=${id}`}
        />
      </div>
    </div>
  );
}
