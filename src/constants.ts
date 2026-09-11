import type { TaskPriority, TaskStatus, TaskType } from "./types";

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  menage: "Ménage",
  travaux: "Travaux",
  achat: "Achat",
  soustraitance: "Sous-traitance",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  blocked: "Bloqué",
  done: "Terminé",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};
