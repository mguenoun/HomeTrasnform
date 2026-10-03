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
          className="ht-row flex flex-wrap items-center justify-between gap-2 p-3"
        >
          <div>
            <p className="font-medium text-[var(--ht-text)]">
              {task.title}
            </p>
            <p className="text-sm text-[var(--ht-text-2)]">
              {TASK_TYPE_LABELS[task.type]} ·{" "}
              {TASK_PRIORITY_LABELS[task.priority]}
              {task.objectiveId &&
                ` · ${objectiveTitleById.get(task.objectiveId) ?? ""}`}
            </p>
            {task.assigneeIds.length > 0 && (
              <p className="text-xs text-[var(--ht-text-3)]">
                {task.assigneeIds
                  .map((assigneeId) => userNameById.get(assigneeId) ?? "?")
                  .join(", ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="ht-pill ht-pill-neutral">
              {TASK_STATUS_LABELS[task.status]}
            </span>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <Breadcrumb
        items={[{ label: "Tableau de bord", to: "/" }, { label: "Tâches" }]}
      />
      <header className="mb-6 flex items-center justify-between">
        <h1 className="ht-h1">
          Tâches
        </h1>
        <Link
          to="/tasks/new"
          className="ht-btn-cta"
        >
          Nouvelle tâche
        </Link>
      </header>

      <div className="mb-6 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm text-[var(--ht-text-body)]">
          <span>Type</span>
          <select
            value={filters.type ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                type: (e.target.value || undefined) as TaskType | undefined,
              })
            }
            className="ht-select"
          >
            <option value="">Tous</option>
            {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--ht-text-body)]">
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
            className="ht-select"
          >
            <option value="">Tous</option>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--ht-text-body)]">
          <span>Objectif</span>
          <select
            value={filters.objectiveId ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                objectiveId: e.target.value || undefined,
              })
            }
            className="ht-select"
          >
            <option value="">Tous</option>
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--ht-text-body)]">
          <span>Assigné</span>
          <select
            value={filters.assigneeId ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                assigneeId: e.target.value || undefined,
              })
            }
            className="ht-select"
          >
            <option value="">Tous</option>
            {users.map((familyUser) => (
              <option key={familyUser.uid} value={familyUser.uid}>
                {familyUser.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--ht-text-body)]">
          <span>Trier par</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as TaskSortKey)}
            className="ht-select"
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
            className={`self-end ${onlyMyTasks ? "ht-chip ht-chip-active" : "ht-chip"}`}
          >
            Mes tâches
          </button>
        )}
      </div>

      {loading && (
        <p className="text-[var(--ht-text-2)]">Chargement...</p>
      )}

      {!loading && (
        <>
          <section>
            <h2 className="mb-2.5 ht-label">
              Tâches partagées
            </h2>
            <ul className="flex flex-col gap-2">
              {sharedTasks.map(renderTaskItem)}
            </ul>
            {sharedTasks.length === 0 && (
              <p className="text-[var(--ht-text-2)]">
                Aucune tâche partagée ne correspond aux filtres.
              </p>
            )}
          </section>

          {privateTasks.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2.5 ht-label">
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
