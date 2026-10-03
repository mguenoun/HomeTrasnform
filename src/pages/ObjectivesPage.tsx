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
    <div className="min-h-screen p-6">
      <Breadcrumb
        items={[{ label: "Tableau de bord", to: "/" }, { label: "Objectifs" }]}
      />
      <header className="mb-6 flex items-center justify-between">
        <h1 className="ht-h1">
          Objectifs
        </h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="ht-btn-cta"
        >
          {showForm ? "Annuler" : "Nouvel objectif"}
        </button>
      </header>

      {showForm && (
        <div className="mb-6 max-w-md ht-card p-4">
          <ObjectiveForm onSubmit={handleCreate} />
        </div>
      )}

      {loading && (
        <p className="text-[var(--ht-text-2)]">Chargement...</p>
      )}

      {!loading && (
        <>
          <section>
            <h2 className="mb-2.5 ht-label">
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
              <p className="text-[var(--ht-text-2)]">
                Aucun objectif partagé pour le moment.
              </p>
            )}
          </section>

          {privateObjectives.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2.5 ht-label">
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
