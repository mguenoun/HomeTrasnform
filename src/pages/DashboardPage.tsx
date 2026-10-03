import { PaymentsHistogram } from "../components/PaymentsHistogram";
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

function RatioKpi({
  label,
  closed,
  total,
}: {
  label: string;
  closed: number;
  total: number;
}) {
  const percent = total === 0 ? 0 : Math.round((closed / total) * 100);
  return (
    <div className="ht-card p-[16px_18px]">
      <div className="ht-kpi-label">{label}</div>
      <div className="mt-1.5 ht-kpi-value">
        {closed} / {total}{" "}
        <span className="ht-kpi-unit">({percent} %)</span>
      </div>
    </div>
  );
}

function BudgetKpi({
  realized,
  budgeted,
}: {
  realized: number;
  budgeted: number;
}) {
  const percent =
    budgeted > 0 ? Math.min(100, (realized / budgeted) * 100) : 0;
  return (
    <div className="ht-card col-span-2 p-[16px_18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-1.5">
        <div className="ht-kpi-label">Budget réalisé / budgété</div>
        <div className="text-[19px] font-extrabold">
          <span className="ht-grad-text">{formatMad(realized)}</span>{" "}
          <span className="ht-kpi-unit">/ {formatMad(budgeted)}</span>
        </div>
      </div>
      <div className="ht-track mt-[9px]">
        <div
          className="ht-fill-grad"
          style={{ width: `${Math.max(percent, 1.5)}%` }}
        />
      </div>
    </div>
  );
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
    <div className="min-h-screen p-6">
      <h1 className="mb-5 ht-h1">Tableau de bord</h1>

      {loading && <p className="mt-6 text-[var(--ht-text-2)]">Chargement...</p>}

      {!loading && (
        <>
          <section>
            <h2 className="mb-2.5 ht-label">Objectifs partagés</h2>
            <div className="grid grid-cols-2 gap-3">
              <RatioKpi
                label="Objectifs clôturés"
                closed={sharedObjectivesKpi.closed}
                total={sharedObjectivesKpi.total}
              />
              <RatioKpi
                label="Tâches clôturées"
                closed={sharedTasksKpi.closed}
                total={sharedTasksKpi.total}
              />
              <BudgetKpi
                realized={sharedBudgetTotals.realized}
                budgeted={sharedBudgetTotals.budgeted}
              />
            </div>
          </section>

          {hasPrivateObjectives && (
            <section className="mt-6">
              <h2 className="mb-2.5 ht-label">Objectifs privés</h2>
              <div className="grid grid-cols-2 gap-3">
                <RatioKpi
                  label="Objectifs clôturés"
                  closed={privateObjectivesKpi.closed}
                  total={privateObjectivesKpi.total}
                />
                <RatioKpi
                  label="Tâches clôturées"
                  closed={privateTasksKpi.closed}
                  total={privateTasksKpi.total}
                />
                <BudgetKpi
                  realized={privateBudgetTotals.realized}
                  budgeted={privateBudgetTotals.budgeted}
                />
              </div>
            </section>
          )}

          <section className="mt-6">
            <PaymentsHistogram items={budgetItems} />
          </section>

          <section className="mt-6">
            <h2 className="mb-2.5 ht-label">Rubriques à surveiller</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {budgetWatchlist.map((item) => (
                <BudgetItemCard key={item.id} item={item} />
              ))}
            </div>
            {budgetWatchlist.length === 0 && (
              <p className="text-sm text-[var(--ht-text-2)]">
                Aucune rubrique à surveiller.
              </p>
            )}
          </section>

          <section className="mt-6">
            <h2 className="mb-2.5 ht-label">Tâches par personne</h2>
            <div className="grid grid-cols-2 gap-3">
              {personKpis.map((kpi) => {
                const isMe = kpi.uid === user?.uid;
                return (
                  <div
                    key={kpi.uid}
                    className={`ht-card p-[16px_18px] ${
                      isMe ? "shadow-[inset_0_0_0_2px_var(--ht-ring-me)]" : ""
                    }`}
                  >
                    <p className="truncate text-[13px] font-bold text-[var(--ht-text)]">
                      {kpi.displayName}
                    </p>
                    <dl className="mt-2 grid grid-cols-3 gap-1 text-center">
                      <div>
                        <dt className="whitespace-nowrap text-[10px] text-[var(--ht-text-3)]">
                          Retard
                        </dt>
                        <dd
                          className={`text-[15px] font-extrabold ${
                            kpi.overdue > 0
                              ? "text-[var(--ht-danger)]"
                              : "text-[var(--ht-text)]"
                          }`}
                        >
                          {kpi.overdue}
                        </dd>
                      </div>
                      <div>
                        <dt className="whitespace-nowrap text-[10px] text-[var(--ht-text-3)]">
                          Clôturées
                        </dt>
                        <dd className="text-[15px] font-extrabold text-[var(--ht-text)]">
                          {kpi.closed}
                        </dd>
                      </div>
                      <div>
                        <dt className="whitespace-nowrap text-[10px] text-[var(--ht-text-3)]">
                          Total
                        </dt>
                        <dd className="text-[15px] font-extrabold text-[var(--ht-text)]">
                          {kpi.total}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
            {personKpis.length === 0 && (
              <p className="text-sm text-[var(--ht-text-2)]">
                Aucune personne pour le moment.
              </p>
            )}
          </section>

          <section className="mt-6">
            <h2 className="mb-2.5 ht-label">Objectifs</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <p className="text-sm text-[var(--ht-text-2)]">
                Aucun objectif pour le moment.
              </p>
            )}
          </section>

          {user && (
            <section className="mt-6">
              <h2 className="mb-2.5 ht-label">Mes tâches à échéance proche</h2>
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
                <p className="text-sm text-[var(--ht-text-2)]">
                  Vous n'avez aucune tâche à échéance proche.
                </p>
              )}
            </section>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <section>
              <h2 className="mb-2.5 ht-label">À échéance proche</h2>
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
                <p className="text-sm text-[var(--ht-text-2)]">
                  Aucune tâche à échéance proche.
                </p>
              )}
            </section>

            <section>
              <h2 className="mb-2.5 ht-label">Tâches bloquées</h2>
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
                <p className="text-sm text-[var(--ht-text-2)]">
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
