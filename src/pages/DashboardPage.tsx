import { Link } from "react-router-dom";
import { ObjectiveSummaryCard } from "../components/ObjectiveSummaryCard";
import { TASK_TYPE_LABELS } from "../constants";
import { getBlockedTasks, getUpcomingTasks } from "../domain/dashboard";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";

export function DashboardPage() {
  const { objectives, loading: objectivesLoading } = useObjectives();
  const { tasks, loading: tasksLoading } = useTasks();

  const activeObjectives = objectives.filter((o) => o.status === "active");
  const upcomingTasks = getUpcomingTasks(tasks);
  const blockedTasks = getBlockedTasks(tasks);
  const loading = objectivesLoading || tasksLoading;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">
        Tableau de bord
      </h1>

      {loading && <p className="mt-6 text-slate-500">Chargement...</p>}

      {!loading && (
        <>
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-slate-700">
              Objectifs
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeObjectives.map((objective) => (
                <ObjectiveSummaryCard
                  key={objective.id}
                  objective={objective}
                  tasks={tasks.filter((t) => t.objectiveId === objective.id)}
                />
              ))}
            </ul>
            {activeObjectives.length === 0 && (
              <p className="text-sm text-slate-500">
                Aucun objectif pour le moment.
              </p>
            )}
          </section>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <section>
              <h2 className="mb-2 text-sm font-medium text-slate-700">
                À échéance proche
              </h2>
              <ul className="flex flex-col gap-2">
                {upcomingTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      to={`/tasks/${task.id}`}
                      className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-3 hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-900">
                        {task.title}
                      </span>
                      <span className="text-xs text-slate-500">
                        {task.dueDate}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {upcomingTasks.length === 0 && (
                <p className="text-sm text-slate-500">
                  Aucune tâche à échéance proche.
                </p>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-sm font-medium text-slate-700">
                Tâches bloquées
              </h2>
              <ul className="flex flex-col gap-2">
                {blockedTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      to={`/tasks/${task.id}`}
                      className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-3 hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-900">
                        {task.title}
                      </span>
                      <span className="text-xs text-slate-500">
                        {TASK_TYPE_LABELS[task.type]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {blockedTasks.length === 0 && (
                <p className="text-sm text-slate-500">
                  Aucune tâche bloquée.
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
