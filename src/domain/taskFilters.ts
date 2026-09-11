import type { Task, TaskPriority, TaskStatus, TaskType } from "../types";

export interface TaskFilters {
  objectiveId?: string | null;
  status?: TaskStatus;
  type?: TaskType;
  room?: string;
  assigneeId?: string;
}

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((task) => {
    if (
      filters.objectiveId !== undefined &&
      task.objectiveId !== filters.objectiveId
    ) {
      return false;
    }
    if (filters.status && task.status !== filters.status) {
      return false;
    }
    if (filters.type && task.type !== filters.type) {
      return false;
    }
    if (filters.room && task.room !== filters.room) {
      return false;
    }
    if (filters.assigneeId && !task.assigneeIds.includes(filters.assigneeId)) {
      return false;
    }
    return true;
  });
}

export type TaskSortKey = "priority" | "dueDate" | "budgetEstimated";

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortTasks(tasks: Task[], sortBy: TaskSortKey): Task[] {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "priority":
        return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      case "dueDate":
        return (a.dueDate ?? "9999-99-99").localeCompare(
          b.dueDate ?? "9999-99-99",
        );
      case "budgetEstimated":
        return (b.budgetEstimated ?? 0) - (a.budgetEstimated ?? 0);
      default:
        return 0;
    }
  });
  return sorted;
}
