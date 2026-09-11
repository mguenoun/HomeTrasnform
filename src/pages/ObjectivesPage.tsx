import { useState } from "react";
import { Link } from "react-router-dom";
import { ObjectiveForm, type ObjectiveFormValues } from "../components/ObjectiveForm";
import { useAuth } from "../context/AuthContext";
import { computeProgress } from "../domain/progress";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";
import { createObjective } from "../services/objectives";

export function ObjectivesPage() {
  const { user } = useAuth();
  const { objectives, loading } = useObjectives();
  const { tasks } = useTasks();
  const [showForm, setShowForm] = useState(false);

  const activeObjectives = objectives.filter((o) => o.status === "active");

  async function handleCreate(values: ObjectiveFormValues) {
    if (!user) return;
    await createObjective({
      title: values.title,
      description: values.description,
      targetDate: values.targetDate || undefined,
      createdBy: user.uid,
    });
    setShowForm(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Objectifs</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Annuler" : "Nouvel objectif"}
        </button>
      </header>

      {showForm && (
        <div className="mb-6 max-w-md rounded border border-slate-200 bg-white p-4">
          <ObjectiveForm onSubmit={handleCreate} />
        </div>
      )}

      {loading && <p className="text-slate-500">Chargement...</p>}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeObjectives.map((objective) => {
          const objectiveTasks = tasks.filter(
            (t) => t.objectiveId === objective.id,
          );
          const progress = computeProgress(objectiveTasks);
          return (
            <li
              key={objective.id}
              className="rounded border border-slate-200 bg-white p-4"
            >
              <Link
                to={`/objectives/${objective.id}`}
                className="text-lg font-medium text-blue-700 hover:underline"
              >
                {objective.title}
              </Link>
              {objective.description && (
                <p className="mt-1 text-sm text-slate-600">
                  {objective.description}
                </p>
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
            </li>
          );
        })}
      </ul>

      {!loading && activeObjectives.length === 0 && (
        <p className="text-slate-500">Aucun objectif pour le moment.</p>
      )}
    </div>
  );
}
