import { Link } from "react-router-dom";
import { ObjectiveSummaryCard } from "../components/ObjectiveSummaryCard";
import { TASK_TYPE_LABELS } from "../constants";
import { useAuth } from "../context/AuthContext";
import {
  countClosedObjectives,
  countClosedTasks,
  getBlockedTasks,
  getTaskKpisByPerson,
  getUpcomingTasks,
  withCurrentFirst,
} from "../domain/dashboard";
import { useFamilyMembers } from "../hooks/useFamilyMembers";
import { useFamilyUsers } from "../hooks/useFamilyUsers";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";

function formatRatio(closed: number, total: number): string {
  const percent = total === 0 ? 0 : Math.round((closed / total) * 100);
  return `${closed} / ${total} (${percent}%)`;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { objectives, loading: objectivesLoading } = useObjectives();
  const { tasks, loading: tasksLoading } = useTasks();
  const { users, loading: usersLoading } = useFamilyUsers();
  const { members, loading: membersLoading } = useFamilyMembers();

  const activeObjectives = objectives.filter((o) => o.status === "active");
  const upcomingTasks = getUpcomingTasks(tasks);
  const blockedTasks = getBlockedTasks(tasks);
  const loading =
    objectivesLoading || tasksLoading || usersLoading || membersLoading;

  const objectivesKpi = countClosedObjectives(objectives);
  const tasksKpi = countClosedTasks(tasks);
  const personKpis = withCurrentFirst(
    getTaskKpisByPerson(tasks, users, members),
    user?.uid,
  );
  const myUpcomingTasks = user
    ? getUpcomingTasks(tasks.filter((t) => t.assigneeIds.includes(user.uid)))
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">
        Tableau de bord
      </h1>

      {loading && <p className="mt-6 text-slate-500">Chargement...</p>}

      {!loading && (
        <>
          <section className="grid grid-cols-2 gap-4">
            <div className="rounded border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-700">
                Objectifs clôturés
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {formatRatio(objectivesKpi.closed, objectivesKpi.total)}
              </p>
            </div>
            <div className="rounded border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-700">
                Tâches clôturées
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {formatRatio(tasksKpi.closed, tasksKpi.total)}
              </p>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-slate-700">
              Tâches par personne
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {personKpis.map((kpi) => {
                const isMe = kpi.uid === user?.uid;
                return (
                  <div
                    key={kpi.uid}
                    className={`rounded border p-4 ${
                      isMe
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <p
                      className={`truncate text-sm ${
                        isMe
                          ? "font-semibold text-blue-900"
                          : "font-medium text-slate-700"
                      }`}
                    >
                      {kpi.displayName}
                    </p>
                    <dl className="mt-2 grid grid-cols-3 gap-1 text-center">
                      <div>
                        <dt className="whitespace-nowrap text-xs text-slate-500">
                          Retard
                        </dt>
                        <dd
                          className={`text-lg font-semibold ${
                            kpi.overdue > 0 ? "text-red-700" : "text-slate-900"
                          }`}
                        >
                          {kpi.overdue}
                        </dd>
                      </div>
                      <div>
                        <dt className="whitespace-nowrap text-xs text-slate-500">
                          Clôturées
                        </dt>
                        <dd className="text-lg font-semibold text-slate-900">
                          {kpi.closed}
                        </dd>
                      </div>
                      <div>
                        <dt className="whitespace-nowrap text-xs text-slate-500">
                          Total
                        </dt>
                        <dd className="text-lg font-semibold text-slate-900">
                          {kpi.total}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
            {personKpis.length === 0 && (
              <p className="text-sm text-slate-500">
                Aucune personne pour le moment.
              </p>
            )}
          </section>

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

          {user && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-medium text-slate-700">
                Mes tâches à échéance proche
              </h2>
              <ul className="flex flex-col gap-2">
                {myUpcomingTasks.map((task) => (
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
              {myUpcomingTasks.length === 0 && (
                <p className="text-sm text-slate-500">
                  Vous n'avez aucune tâche à échéance proche.
                </p>
              )}
            </section>
          )}

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
