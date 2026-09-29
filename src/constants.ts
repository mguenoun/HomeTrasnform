import type { BudgetItemStatus } from "./domain/budgetItems";
import type {
  BudgetCategory,
  BudgetPaymentStatus,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "./types";

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

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  materiaux: "Matériaux",
  main_oeuvre: "Main d'œuvre",
  equipement: "Équipement",
  mobilier: "Mobilier",
  transport: "Transport",
  honoraires: "Honoraires",
  etudes: "Études",
  imprevus: "Imprévus",
  autre: "Autre",
};

export const BUDGET_PAYMENT_STATUS_LABELS: Record<BudgetPaymentStatus, string> = {
  prevu: "Prévu",
  paye: "Payé",
};

export const BUDGET_ITEM_STATUS_LABELS: Record<BudgetItemStatus, string> = {
  over: "Dépassé",
  watch: "À surveiller",
  ok: "Dans les clous",
};

export const BUDGET_ITEM_STATUS_BADGE_CLASSES: Record<BudgetItemStatus, string> = {
  over: "bg-red-100 text-red-700",
  watch: "bg-orange-100 text-orange-700",
  ok: "bg-green-100 text-green-700",
};
