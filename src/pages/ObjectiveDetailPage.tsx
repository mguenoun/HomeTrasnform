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
import type { TaskStatus } from "../types";

const TASK_STATUS_PILL: Record<TaskStatus, string> = {
  todo: "ht-pill ht-pill-neutral",
  in_progress: "ht-pill ht-pill-info",
  blocked: "ht-pill ht-pill-over",
  done: "ht-pill ht-pill-ok",
};

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
      <div className="p-6">
        <p className="text-[var(--ht-text-2)]">Objectif introuvable.</p>
        <Link to="/objectives" className="ht-link">
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
    <div className="min-h-screen p-6">
      <Breadcrumb
        items={[
          { label: "Tableau de bord", to: "/" },
          { label: "Objectifs", to: "/objectives" },
          { label: objective.title },
        ]}
      />

      {editing ? (
        <div className="ht-card mt-4 max-w-md p-4">
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
            <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.4px] text-[var(--ht-text)]">
              {objective.title}
            </h1>
            {objective.visibility === "private" && (
              <span className="ht-pill ht-pill-neutral">Privé</span>
            )}
          </div>
          {objective.description && (
            <p className="mt-1 text-[13px] text-[var(--ht-text-2)]">
              {objective.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditing(true)} className="ht-btn">
              Éditer
            </button>
            <button type="button" onClick={handleArchive} className="ht-btn">
              {objective.status === "active" ? "Archiver" : "Réactiver"}
            </button>
            <button type="button" onClick={handleDelete} className="ht-btn ht-btn-danger">
              Supprimer
            </button>
          </div>
          <div className="mt-4 ht-track">
            <div className="ht-fill-ok" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--ht-text-3)]">
            {progress.done}/{progress.total} tâches terminées ({progress.percent} %)
          </p>
        </header>
      )}

      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="ht-label">Tâches</h2>
        <Link to={`/tasks/new?objectiveId=${id}`} className="ht-btn-cta-sm">
          + Ajouter
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {objectiveTasks.map((task) => (
          <li key={task.id}>
            <Link
              to={`/tasks/${task.id}`}
              className="ht-row flex items-center justify-between gap-2 p-[12px_14px] hover:brightness-[1.03]"
            >
              <span className="ht-title text-[13px]">{task.title}</span>
              <span className={TASK_STATUS_PILL[task.status]}>
                {TASK_TYPE_LABELS[task.type]} · {TASK_STATUS_LABELS[task.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {objectiveTasks.length === 0 && (
        <p className="text-sm text-[var(--ht-text-2)]">
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
