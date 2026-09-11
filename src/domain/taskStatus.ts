import type { Task, TaskStatus, TaskType } from "../types";

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress", "blocked"],
  in_progress: ["blocked", "done", "todo"],
  blocked: ["in_progress"],
  done: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export interface StatusChangeResult {
  status: TaskStatus;
  closedAt?: number;
  closedBy?: string;
}

export function applyStatusChange(
  task: Pick<Task, "status">,
  to: TaskStatus,
  actorId: string,
  now: number = Date.now(),
): StatusChangeResult {
  if (!canTransition(task.status, to)) {
    throw new Error(`Transition invalide de "${task.status}" vers "${to}"`);
  }
  if (to === "done") {
    return { status: to, closedAt: now, closedBy: actorId };
  }
  return { status: to };
}

const TYPES_REQUIRING_BUDGET: TaskType[] = ["achat", "soustraitance"];

export function isBudgetRequired(type: TaskType): boolean {
  return TYPES_REQUIRING_BUDGET.includes(type);
}

export function isTaskValid(
  task: Pick<Task, "title" | "type" | "budgetEstimated">,
): { valid: boolean; error?: string } {
  if (!task.title.trim()) {
    return { valid: false, error: "Le titre est obligatoire." };
  }
  if (
    isBudgetRequired(task.type) &&
    (task.budgetEstimated === undefined || task.budgetEstimated <= 0)
  ) {
    return {
      valid: false,
      error: "Un budget estimé est requis pour ce type de tâche.",
    };
  }
  return { valid: true };
}
