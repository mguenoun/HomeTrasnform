export type TaskType = "menage" | "travaux" | "achat" | "soustraitance";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export type TaskPriority = "low" | "medium" | "high";

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface FamilyUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  colorTag?: string;
  pushSubscriptions?: PushSubscriptionRecord[];
}

/**
 * Entrée de la liste blanche `familymembers` (autorise l'accès à l'app).
 * Existe indépendamment de `FamilyUser` : une personne peut y figurer sans
 * jamais s'être encore connectée (donc sans profil `users`).
 */
export interface FamilyMemberRecord {
  email: string;
  uid?: string;
}

export type ObjectiveStatus = "active" | "archived";

export interface Objective {
  id: string;
  title: string;
  description?: string;
  targetDate?: string | null;
  status: ObjectiveStatus;
  createdBy: string;
  createdAt: number;
}

export interface Task {
  id: string;
  objectiveId: string | null;
  title: string;
  description?: string;
  type: TaskType;
  room?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeIds: string[];
  dueDate?: string | null;
  dueReminderSentAt?: number | null;
  budgetEstimated?: number | null;
  budgetActual?: number | null;
  currency?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
  closedBy?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: number;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  contentType: string;
  size: number;
  chunkCount: number;
  uploadedBy: string;
  uploadedAt: number;
}
