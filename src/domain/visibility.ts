import type { BudgetItem, Objective, Task } from "../types";

/**
 * Ids des objectifs privés parmi une liste d'objectifs. Un objectif est
 * privé s'il porte `visibility: "private"` ; absent ou "shared" = partagé
 * (voir `ObjectiveVisibility` dans `src/types/index.ts`).
 */
export function getPrivateObjectiveIds(objectives: Objective[]): Set<string> {
  return new Set(
    objectives.filter((o) => o.visibility === "private").map((o) => o.id),
  );
}

/**
 * Une tâche est privée si elle est rattachée à un objectif privé. Une tâche
 * sans objectif (`objectiveId: null`) est toujours partagée.
 */
export function isTaskPrivate(
  task: Pick<Task, "objectiveId">,
  privateObjectiveIds: Set<string>,
): boolean {
  return task.objectiveId != null && privateObjectiveIds.has(task.objectiveId);
}

/**
 * Une rubrique budgétaire est privée si elle est rattachée à un objectif
 * privé (directement, ou via la tâche dont elle hérite l'objectif à la
 * création — voir `BudgetItemCreatePage`, qui recopie systématiquement
 * `task.objectiveId` dans `objectiveId`).
 */
export function isBudgetItemPrivate(
  item: Pick<BudgetItem, "objectiveId">,
  privateObjectiveIds: Set<string>,
): boolean {
  return item.objectiveId != null && privateObjectiveIds.has(item.objectiveId);
}
