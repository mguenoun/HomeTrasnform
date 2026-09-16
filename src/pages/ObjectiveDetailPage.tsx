import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ObjectiveForm, type ObjectiveFormValues } from "../components/ObjectiveForm";
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS } from "../constants";
import { computeProgress } from "../domain/progress";
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
  const [editing, setEditing] = useState(false);

  const objective = objectives.find((o) => o.id === id);
  const objectiveTasks = tasks.filter((t) => t.objectiveId === id);
  const progress = computeProgress(objectiveTasks);

  if (!objective) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Objectif introuvable.</p>
        <Link to="/objectives" className="text-blue-700 hover:underline">
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
    <div className="min-h-screen bg-slate-50 p-6">
      <Link to="/objectives" className="text-sm text-blue-700 hover:underline">
        ← Objectifs
      </Link>

      {editing ? (
        <div className="mt-4 max-w-md rounded border border-slate-200 bg-white p-4">
          <ObjectiveForm
            initialValues={{
              title: objective.title,
              description: objective.description ?? "",
              targetDate: objective.targetDate ?? "",
            }}
            submitLabel="Enregistrer"
            onSubmit={handleUpdate}
          />
        </div>
      ) : (
        <header className="mt-4 mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            {objective.title}
          </h1>
          {objective.description && (
            <p className="mt-1 text-slate-600">{objective.description}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
            >
              Éditer
            </button>
            <button
              type="button"
              onClick={handleArchive}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
            >
              {objective.status === "active" ? "Archiver" : "Réactiver"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
            >
              Supprimer
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {progress.done}/{progress.total} tâches terminées ({progress.percent}
            %)
          </p>
        </header>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-900">Tâches</h2>
        <Link
          to={`/tasks/new?objectiveId=${id}`}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ajouter une tâche
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {objectiveTasks.map((task) => (
          <li key={task.id}>
            <Link
              to={`/tasks/${task.id}`}
              className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 hover:bg-slate-50"
            >
              <span>{task.title}</span>
              <span className="text-sm text-slate-500">
                {TASK_TYPE_LABELS[task.type]} · {TASK_STATUS_LABELS[task.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {objectiveTasks.length === 0 && (
        <p className="text-slate-500">Aucune tâche rattachée pour le moment.</p>
      )}
    </div>
  );
}
