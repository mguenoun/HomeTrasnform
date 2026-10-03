import { BudgetItemCard } from "../components/BudgetItemCard";
import { ObjectiveSummaryCard } from "../components/ObjectiveSummaryCard";
import { TaskRow } from "../components/TaskRow";
import { TASK_TYPE_LABELS } from "../constants";
import { useAuth } from "../context/AuthContext";
import { getWatchlist, summarizeBudgetItems } from "../domain/budgetItems";
import {
  countClosedObjectives,
  countClosedTasks,
  getBlockedTasks,
  getTaskKpisByPerson,
  getUpcomingTasks,
  withCurrentFirst,
} from "../domain/dashboard";
import { formatMad } from "../domain/money";
import {
  getPrivateObjectiveIds,
  isBudgetItemPrivate,
  isTaskPrivate,
} from "../domain/visibility";
import { useBudgetItems } from "../hooks/useBudgetItems";
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
  const { items: budgetItems, loading: budgetLoading } = useBudgetItems();

  const activeObjectives = objectives.filter((o) => o.status === "active");
  const upcomingTasks = getUpcomingTasks(tasks);
  const blockedTasks = getBlockedTasks(tasks);
  const loading =
    objectivesLoading ||
    tasksLoading ||
    usersLoading ||
    membersLoading ||
    budgetLoading;

  const personKpis = withCurrentFirst(
    getTaskKpisByPerson(tasks, users, members),
    user?.uid,
  );
  const myUpcomingTasks = user
    ? getUpcomingTasks(tasks.filter((t) => t.assigneeIds.includes(user.uid)))
    : [];
  const budgetWatchlist = getWatchlist(budgetItems);
  const privateObjectiveIds = getPrivateObjectiveIds(objectives);
  const taskIsPrivate = (task: { objectiveId: string | null }) =>
    isTaskPrivate(task, privateObjectiveIds);
  const budgetItemIsPrivate = (item: { objectiveId: string | null }) =>
    isBudgetItemPrivate(item, privateObjectiveIds);

  const sharedObjectives = objectives.filter((o) => o.visibility !== "private");
  const privateObjectives = objectives.filter((o) => o.visibility === "private");
  const sharedTasks = tasks.filter((t) => !taskIsPrivate(t));
  const privateTasks = tasks.filter((t) => taskIsPrivate(t));
  const sharedBudgetItems = budgetItems.filter((b) => !budgetItemIsPrivate(b));
  const privateBudgetItems = budgetItems.filter((b) => budgetItemIsPrivate(b));

  const sharedObjectivesKpi = countClosedObjectives(sharedObjectives);
  const sharedTasksKpi = countClosedTasks(sharedTasks);
  const sharedBudgetTotals = summarizeBudgetItems(sharedBudgetItems);

  const privateObjectivesKpi = countClosedObjectives(privateObjectives);
  const privateTasksKpi = countClosedTasks(privateTasks);
  const privateBudgetTotals = summarizeBudgetItems(privateBudgetItems);
  const hasPrivateObjectives = privateObjectives.length > 0;

  return (
    <div className="min-h-screen bg-[#f7f5f1] p-6 dark:bg-[radial-gradient(circle_at_18%_-10%,#16243f_0%,#0c1628_45%,#020408_100%)]">
      <h1 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-50">
        Tableau de bord
      </h1>

      {loading && (
        <p className="mt-6 text-slate-500 dark:text-slate-400">Chargement...</p>
      )}

      {!loading && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
              Objectifs partagés
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
                  Objectifs clôturés
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  {formatRatio(
                    sharedObjectivesKpi.closed,
                    sharedObjectivesKpi.total,
                  )}
                </p>
              </div>
              <div className="rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
                  Tâches clôturées
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  {formatRatio(sharedTasksKpi.closed, sharedTasksKpi.total)}
                </p>
              </div>
              <div className="col-span-2 rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
                  Budget réalisé / budgété
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent dark:from-amber-400">
                    {formatMad(sharedBudgetTotals.realized)}
                  </span>{" "}
                  <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                    / {formatMad(sharedBudgetTotals.budgeted)}
                  </span>
                </p>
              </div>
            </div>
          </section>

          {hasPrivateObjectives && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
                Objectifs privés
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
                    Objectifs clôturés
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {formatRatio(
                      privateObjectivesKpi.closed,
                      privateObjectivesKpi.total,
                    )}
                  </p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
                    Tâches clôturées
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {formatRatio(
                      privateTasksKpi.closed,
                      privateTasksKpi.total,
                    )}
                  </p>
                </div>
                <div className="col-span-2 rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
                    Budget réalisé / budgété
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent dark:from-amber-400">
                      {formatMad(privateBudgetTotals.realized)}
                    </span>{" "}
                    <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                      / {formatMad(privateBudgetTotals.budgeted)}
                    </span>
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
              Rubriques à surveiller
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {budgetWatchlist.map((item) => (
                <BudgetItemCard key={item.id} item={item} />
              ))}
            </div>
            {budgetWatchlist.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aucune rubrique à surveiller.
              </p>
            )}
          </section>

          <section className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
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
                        ? "border-blue-300 bg-blue-50 dark:border-sky-400/50 dark:bg-white/[0.04] dark:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.5)]"
                        : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]"
                    }`}
                  >
                    <p
                      className={`truncate text-sm ${
                        isMe
                          ? "font-semibold text-blue-900 dark:text-slate-50"
                          : "font-medium text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {kpi.displayName}
                    </p>
                    <dl className="mt-2 grid grid-cols-3 gap-1 text-center">
                      <div>
                        <dt className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-500">
                          Retard
                        </dt>
                        <dd
                          className={`text-lg font-semibold ${
                            kpi.overdue > 0
                              ? "text-red-700 dark:text-red-400"
                              : "text-slate-900 dark:text-slate-50"
                          }`}
                        >
                          {kpi.overdue}
                        </dd>
                      </div>
                      <div>
                        <dt className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-500">
                          Clôturées
                        </dt>
                        <dd className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                          {kpi.closed}
                        </dd>
                      </div>
                      <div>
                        <dt className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-500">
                          Total
                        </dt>
                        <dd className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                          {kpi.total}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
            {personKpis.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aucune personne pour le moment.
              </p>
            )}
          </section>

          <section className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
              Objectifs
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeObjectives.map((objective) => (
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
            {activeObjectives.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aucun objectif pour le moment.
              </p>
            )}
          </section>

          {user && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
                Mes tâches à échéance proche
              </h2>
              <ul className="flex flex-col gap-2">
                {myUpcomingTasks.map((task) => (
                  <li key={task.id}>
                    <TaskRow
                      task={task}
                      meta={task.dueDate}
                      budgetItems={budgetItems.filter(
                        (b) => b.taskId === task.id,
                      )}
                      isPrivate={taskIsPrivate(task)}
                    />
                  </li>
                ))}
              </ul>
              {myUpcomingTasks.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Vous n'avez aucune tâche à échéance proche.
                </p>
              )}
            </section>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <section>
              <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
                À échéance proche
              </h2>
              <ul className="flex flex-col gap-2">
                {upcomingTasks.map((task) => (
                  <li key={task.id}>
                    <TaskRow
                      task={task}
                      meta={task.dueDate}
                      budgetItems={budgetItems.filter(
                        (b) => b.taskId === task.id,
                      )}
                      isPrivate={taskIsPrivate(task)}
                    />
                  </li>
                ))}
              </ul>
              {upcomingTasks.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Aucune tâche à échéance proche.
                </p>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
                Tâches bloquées
              </h2>
              <ul className="flex flex-col gap-2">
                {blockedTasks.map((task) => (
                  <li key={task.id}>
                    <TaskRow
                      task={task}
                      meta={TASK_TYPE_LABELS[task.type]}
                      budgetItems={budgetItems.filter(
                        (b) => b.taskId === task.id,
                      )}
                      isPrivate={taskIsPrivate(task)}
                    />
                  </li>
                ))}
              </ul>
              {blockedTasks.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
