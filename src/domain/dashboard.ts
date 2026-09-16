import type { FamilyMemberRecord, FamilyUser, Objective, Task } from "../types";

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
 * Pour chaque personne connue, chaque assigné rencontré dans les tâches
 * (même sans profil connu, ex. profil supprimé depuis) et chaque membre
 * autorisé (`familymembers`) qui ne s'est encore jamais connecté : nombre de
 * tâches en retard, clôturées et le total des tâches qui lui sont assignées.
 * On combine ces sources pour ne jamais omettre silencieusement quelqu'un.
 */
export function getTaskKpisByPerson(
  tasks: Task[],
  users: FamilyUser[],
  members: FamilyMemberRecord[] = [],
  referenceDate: Date = new Date(),
): PersonTaskKpi[] {
  const displayNameByUid = new Map(users.map((u) => [u.uid, u.displayName]));
  const uids = new Set([
    ...users.map((u) => u.uid),
    ...tasks.flatMap((t) => t.assigneeIds),
  ]);

  const knownPeople = Array.from(uids).map((uid) => {
    const userTasks = tasks.filter((t) => t.assigneeIds.includes(uid));
    return {
      uid,
      displayName: displayNameByUid.get(uid) ?? "Utilisateur inconnu",
      overdue: userTasks.filter((t) => isTaskOverdue(t, referenceDate)).length,
      closed: userTasks.filter((t) => t.status === "done").length,
      total: userTasks.length,
    };
  });

  const knownEmails = new Set(users.map((u) => u.email));
  const neverLoggedIn = members
    .filter(
      (member) =>
        !knownEmails.has(member.email) &&
        !(member.uid && uids.has(member.uid)),
    )
    .map((member) => ({
      uid: member.uid ?? `pending:${member.email}`,
      displayName: member.email,
      overdue: 0,
      closed: 0,
      total: 0,
    }));

  return [...knownPeople, ...neverLoggedIn].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

/**
 * Replace l'élément dont l'`uid` correspond à `currentUid` en tête de liste,
 * sans changer l'ordre relatif des autres (ex. mettre en avant sa propre
 * carte de KPI dans le tableau de bord).
 */
export function withCurrentFirst<T extends { uid: string }>(
  items: T[],
  currentUid?: string,
): T[] {
  if (!currentUid) return items;
  const mine = items.find((item) => item.uid === currentUid);
  if (!mine) return items;
  return [mine, ...items.filter((item) => item.uid !== currentUid)];
}
