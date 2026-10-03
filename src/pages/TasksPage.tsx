import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Breadcrumb } from "../components/Breadcrumb";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "../constants";
import { useAuth } from "../context/AuthContext";
import { filterTasks, sortTasks, type TaskFilters, type TaskSortKey } from "../domain/taskFilters";
import { getPrivateObjectiveIds, isTaskPrivate } from "../domain/visibility";
import { useFamilyUsers } from "../hooks/useFamilyUsers";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";
import type { TaskStatus, TaskType } from "../types";

export function TasksPage() {
  const { user } = useAuth();
  const { tasks, loading } = useTasks();
  const { objectives } = useObjectives();
  const { users } = useFamilyUsers();
  const [filters, setFilters] = useState<TaskFilters>({});
  const [sortBy, setSortBy] = useState<TaskSortKey>("priority");

  const visibleTasks = useMemo(
    () => sortTasks(filterTasks(tasks, filters), sortBy),
    [tasks, filters, sortBy],
  );

  const objectiveTitleById = new Map(objectives.map((o) => [o.id, o.title]));
  const userNameById = new Map(users.map((u) => [u.uid, u.displayName]));
  const onlyMyTasks = Boolean(user) && filters.assigneeId === user?.uid;

  const privateObjectiveIds = getPrivateObjectiveIds(objectives);
  const sharedTasks = visibleTasks.filter(
    (t) => !isTaskPrivate(t, privateObjectiveIds),
  );
  const privateTasks = visibleTasks.filter((t) =>
    isTaskPrivate(t, privateObjectiveIds),
  );

  function renderTaskItem(task: (typeof visibleTasks)[number]) {
    return (
      <li key={task.id}>
        <Link
          to={`/tasks/${task.id}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
        >
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-50">
              {task.title}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {TASK_TYPE_LABELS[task.type]} ·{" "}
              {TASK_PRIORITY_LABELS[task.priority]}
              {task.objectiveId &&
                ` · ${objectiveTitleById.get(task.objectiveId) ?? ""}`}
            </p>
            {task.assigneeIds.length > 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {task.assigneeIds
                  .map((assigneeId) => userNameById.get(assigneeId) ?? "?")
                  .join(", ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
              {TASK_STATUS_LABELS[task.status]}
            </span>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f1] p-6 dark:bg-[radial-gradient(circle_at_18%_-10%,#16243f_0%,#0c1628_45%,#020408_100%)]">
      <Breadcrumb
        items={[{ label: "Tableau de bord", to: "/" }, { label: "Tâches" }]}
      />
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Tâches
        </h1>
        <Link
          to="/tasks/new"
          className="rounded bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 px-4 py-2 font-medium text-slate-950 hover:brightness-105"
        >
          Nouvelle tâche
        </Link>
      </header>

      <div className="mb-6 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          <span>Type</span>
          <select
            value={filters.type ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                type: (e.target.value || undefined) as TaskType | undefined,
              })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          >
            <option value="">Tous</option>
            {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          <span>Statut</span>
          <select
            value={filters.status ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: (e.target.value || undefined) as
                  | TaskStatus
                  | undefined,
              })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          >
            <option value="">Tous</option>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          <span>Objectif</span>
          <select
            value={filters.objectiveId ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                objectiveId: e.target.value || undefined,
              })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          >
            <option value="">Tous</option>
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          <span>Assigné</span>
          <select
            value={filters.assigneeId ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                assigneeId: e.target.value || undefined,
              })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          >
            <option value="">Tous</option>
            {users.map((familyUser) => (
              <option key={familyUser.uid} value={familyUser.uid}>
                {familyUser.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          <span>Trier par</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as TaskSortKey)}
            className="rounded border border-slate-300 px-2 py-1 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          >
            <option value="priority">Priorité</option>
            <option value="dueDate">Échéance</option>
          </select>
        </label>

        {user && (
          <button
            type="button"
            onClick={() =>
              setFilters((f) => ({
                ...f,
                assigneeId: onlyMyTasks ? undefined : user.uid,
              }))
            }
            aria-pressed={onlyMyTasks}
            className={`self-end rounded border px-3 py-1 text-sm ${
              onlyMyTasks
                ? "border-amber-400 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-slate-950"
                : "border-slate-300 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            }`}
          >
            Mes tâches
          </button>
        )}
      </div>

      {loading && (
        <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
      )}

      {!loading && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
              Tâches partagées
            </h2>
            <ul className="flex flex-col gap-2">
              {sharedTasks.map(renderTaskItem)}
            </ul>
            {sharedTasks.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400">
                Aucune tâche partagée ne correspond aux filtres.
              </p>
            )}
          </section>

          {privateTasks.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-400">
                Tâches privées
              </h2>
              <ul className="flex flex-col gap-2">
                {privateTasks.map(renderTaskItem)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
