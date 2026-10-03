import { useState } from "react";
import { Breadcrumb } from "../components/Breadcrumb";
import { ObjectiveForm, type ObjectiveFormValues } from "../components/ObjectiveForm";
import { ObjectiveSummaryCard } from "../components/ObjectiveSummaryCard";
import { useAuth } from "../context/AuthContext";
import { useBudgetItems } from "../hooks/useBudgetItems";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";
import { createObjective } from "../services/objectives";

export function ObjectivesPage() {
  const { user } = useAuth();
  const { objectives, loading } = useObjectives();
  const { tasks } = useTasks();
  const { items: budgetItems } = useBudgetItems();
  const [showForm, setShowForm] = useState(false);

  const activeObjectives = objectives.filter((o) => o.status === "active");
  const sharedObjectives = activeObjectives.filter(
    (o) => o.visibility !== "private",
  );
  const privateObjectives = activeObjectives.filter(
    (o) => o.visibility === "private",
  );

  async function handleCreate(values: ObjectiveFormValues) {
    if (!user) return;
    await createObjective({
      title: values.title,
      description: values.description,
      targetDate: values.targetDate || undefined,
      visibility: values.visibility,
      createdBy: user.uid,
    });
    setShowForm(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-[radial-gradient(circle_at_18%_-10%,#16243f_0%,#0c1628_45%,#020408_100%)]">
      <Breadcrumb
        items={[{ label: "Tableau de bord", to: "/" }, { label: "Objectifs" }]}
      />
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Objectifs
        </h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 dark:bg-gradient-to-r dark:from-amber-400 dark:via-orange-500 dark:to-red-500 dark:text-slate-950 dark:hover:brightness-105"
        >
          {showForm ? "Annuler" : "Nouvel objectif"}
        </button>
      </header>

      {showForm && (
        <div className="mb-6 max-w-md rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <ObjectiveForm onSubmit={handleCreate} />
        </div>
      )}

      {loading && (
        <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
      )}

      {!loading && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
              Objectifs partagés
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sharedObjectives.map((objective) => (
                <ObjectiveSummaryCard
                  key={objective.id}
                  objective={objective}
                  tasks={tasks.filter((t) => t.objectiveId === objective.id)}
                  budgetItems={budgetItems.filter(
                    (b) => b.objectiveId === objective.id,
                  )}
                />
              ))}
            </ul>
            {sharedObjectives.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400">
                Aucun objectif partagé pour le moment.
              </p>
            )}
          </section>

          {privateObjectives.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
                Objectifs privés
              </h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {privateObjectives.map((objective) => (
                  <ObjectiveSummaryCard
                    key={objective.id}
                    objective={objective}
                    tasks={tasks.filter((t) => t.objectiveId === objective.id)}
                    budgetItems={budgetItems.filter(
                      (b) => b.objectiveId === objective.id,
                    )}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
