import type { FamilyUser, Objective, Task } from "../types";

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

export interface ClosedRatio {
  closed: number;
  total: number;
}

export function countClosedObjectives(objectives: Objective[]): ClosedRatio {
  return {
    closed: objectives.filter((o) => o.status === "archived").length,
    total: objectives.length,
  };
}

export function countClosedTasks(tasks: Task[]): ClosedRatio {
  return {
    closed: tasks.filter((t) => t.status === "done").length,
    total: tasks.length,
  };
}

export function isTaskOverdue(
  task: Task,
  referenceDate: Date = new Date(),
): boolean {
  return (
    task.status !== "done" && !!task.dueDate && new Date(task.dueDate) < referenceDate
  );
}

export interface PersonTaskKpi {
  uid: string;
  displayName: string;
  overdue: number;
  closed: number;
  total: number;
}

/**
 * Pour chaque personne de la famille : nombre de tâches en retard,
 * clôturées et le total des tâches qui lui sont assignées.
 */
export function getTaskKpisByPerson(
  tasks: Task[],
  users: FamilyUser[],
  referenceDate: Date = new Date(),
): PersonTaskKpi[] {
  return users
    .map((user) => {
      const userTasks = tasks.filter((t) => t.assigneeIds.includes(user.uid));
      return {
        uid: user.uid,
        displayName: user.displayName,
        overdue: userTasks.filter((t) => isTaskOverdue(t, referenceDate)).length,
        closed: userTasks.filter((t) => t.status === "done").length,
        total: userTasks.length,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
