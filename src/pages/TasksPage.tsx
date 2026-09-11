import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "../constants";
import { filterTasks, sortTasks, type TaskFilters, type TaskSortKey } from "../domain/taskFilters";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";
import type { TaskStatus, TaskType } from "../types";

export function TasksPage() {
  const { tasks, loading } = useTasks();
  const { objectives } = useObjectives();
  const [filters, setFilters] = useState<TaskFilters>({});
  const [sortBy, setSortBy] = useState<TaskSortKey>("priority");

  const visibleTasks = useMemo(
    () => sortTasks(filterTasks(tasks, filters), sortBy),
    [tasks, filters, sortBy],
  );

  const objectiveTitleById = new Map(objectives.map((o) => [o.id, o.title]));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Tâches</h1>
        <Link
          to="/tasks/new"
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Nouvelle tâche
        </Link>
      </header>

      <div className="mb-6 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>Type</span>
          <select
            value={filters.type ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                type: (e.target.value || undefined) as TaskType | undefined,
              })
            }
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="">Tous</option>
            {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
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
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="">Tous</option>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Objectif</span>
          <select
            value={filters.objectiveId ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                objectiveId: e.target.value || undefined,
              })
            }
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="">Tous</option>
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Trier par</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as TaskSortKey)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="priority">Priorité</option>
            <option value="dueDate">Échéance</option>
            <option value="budgetEstimated">Budget</option>
          </select>
        </label>
      </div>

      {loading && <p className="text-slate-500">Chargement...</p>}

      <ul className="flex flex-col gap-2">
        {visibleTasks.map((task) => (
          <li key={task.id}>
            <Link
              to={`/tasks/${task.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white p-3 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">{task.title}</p>
                <p className="text-sm text-slate-500">
                  {TASK_TYPE_LABELS[task.type]} ·{" "}
                  {TASK_PRIORITY_LABELS[task.priority]}
                  {task.objectiveId &&
                    ` · ${objectiveTitleById.get(task.objectiveId) ?? ""}`}
                </p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {TASK_STATUS_LABELS[task.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {!loading && visibleTasks.length === 0 && (
        <p className="text-slate-500">Aucune tâche ne correspond aux filtres.</p>
      )}
    </div>
  );
}
