import type { Task } from "../types";

/**
 * Tâches non terminées dont l'échéance est déjà passée ou tombe dans les
 * `withinDays` prochains jours, triées par échéance la plus proche d'abord.
 */
export function getUpcomingTasks(
  tasks: Task[],
  referenceDate: Date = new Date(),
  withinDays = 7,
): Task[] {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() + withinDays);

  return tasks
    .filter((task) => task.status !== "done" && task.dueDate)
    .filter((task) => new Date(task.dueDate as string) <= end)
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string));
}

export function getBlockedTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.status === "blocked");
}
