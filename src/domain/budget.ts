import type { Task } from "../types";

export interface BudgetSummary {
  estimated: number;
  actual: number;
  overBudget: boolean;
}

export function summarizeTaskBudget(task: Task): BudgetSummary {
  const estimated = task.budgetEstimated ?? 0;
  const actual = task.budgetActual ?? 0;
  return {
    estimated,
    actual,
    overBudget: actual > estimated && estimated > 0,
  };
}

export function summarizeBudget(tasks: Task[]): BudgetSummary {
  return tasks.reduce<BudgetSummary>(
    (acc, task) => ({
      estimated: acc.estimated + (task.budgetEstimated ?? 0),
      actual: acc.actual + (task.budgetActual ?? 0),
      overBudget: acc.overBudget || summarizeTaskBudget(task).overBudget,
    }),
    { estimated: 0, actual: 0, overBudget: false },
  );
}

export function groupBudgetByObjective(
  tasks: Task[],
): Record<string, BudgetSummary> {
  const groups: Record<string, Task[]> = {};
  for (const task of tasks) {
    const key = task.objectiveId ?? "unassigned";
    groups[key] = groups[key] ? [...groups[key], task] : [task];
  }
  return Object.fromEntries(
    Object.entries(groups).map(([key, groupTasks]) => [
      key,
      summarizeBudget(groupTasks),
    ]),
  );
}

export function groupBudgetByType(
  tasks: Task[],
): Record<Task["type"], BudgetSummary> {
  const groups: Partial<Record<Task["type"], Task[]>> = {};
  for (const task of tasks) {
    groups[task.type] = groups[task.type]
      ? [...(groups[task.type] as Task[]), task]
      : [task];
  }
  return Object.fromEntries(
    Object.entries(groups).map(([key, groupTasks]) => [
      key,
      summarizeBudget(groupTasks as Task[]),
    ]),
  ) as Record<Task["type"], BudgetSummary>;
}
