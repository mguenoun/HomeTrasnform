import type { FirestoreDocument } from "./firestoreClient";
import type { ServiceAccount } from "./googleAuth";

const REMINDER_WINDOW_DAYS = 2;

export interface ReminderTask {
  title: string;
  status: string;
  dueDate?: string | null;
  assigneeIds?: string[];
  dueReminderSentAt?: number | null;
}

export interface ReminderUser {
  pushSubscriptions?: Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }>;
}

type PushSender = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
) => Promise<{ ok: boolean; statusCode?: number }>;

export interface ReminderEnv {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_SERVICE_ACCOUNT_EMAIL: string;
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
}

export interface ReminderDeps {
  getAccessToken: (account: ServiceAccount) => Promise<string>;
  listTasks: (
    projectId: string,
    accessToken: string,
  ) => Promise<FirestoreDocument<ReminderTask>[]>;
  getUser: (
    projectId: string,
    uid: string,
    accessToken: string,
  ) => Promise<FirestoreDocument<ReminderUser> | null>;
  markReminded: (
    projectId: string,
    taskId: string,
    accessToken: string,
  ) => Promise<void>;
  sendPush: PushSender;
  now: () => Date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Un rappel est dû une fois, quand l'échéance est dans la fenêtre à venir
// (ou déjà dépassée) et qu'aucun rappel n'a encore été envoyé pour cette
// échéance. updateTask() réinitialise dueReminderSentAt dès que dueDate
// change, ce qui permet un nouveau rappel si la date est repoussée.
export function shouldRemind(task: ReminderTask, today: Date): boolean {
  if (task.status === "done") return false;
  if (!task.dueDate) return false;
  if (task.dueReminderSentAt) return false;
  const limit = new Date(today);
  limit.setDate(limit.getDate() + REMINDER_WINDOW_DAYS);
  return task.dueDate <= isoDate(limit);
}

export async function runDueDateReminders(
  env: ReminderEnv,
  deps: ReminderDeps,
): Promise<{ tasksReminded: number }> {
  const accessToken = await deps.getAccessToken({
    clientEmail: env.FIREBASE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY,
  });

  const tasks = await deps.listTasks(env.FIREBASE_PROJECT_ID, accessToken);
  const today = deps.now();
  const dueTasks = tasks.filter((task) => shouldRemind(task.data, today));

  let tasksReminded = 0;
  for (const task of dueTasks) {
    const assigneeIds = task.data.assigneeIds ?? [];
    const subscriptions: Array<{
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }> = [];
    for (const uid of assigneeIds) {
      const user = await deps.getUser(env.FIREBASE_PROJECT_ID, uid, accessToken);
      subscriptions.push(...(user?.data.pushSubscriptions ?? []));
    }

    if (subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: "Échéance à venir",
        body: `${task.data.title} — échéance le ${task.data.dueDate}`,
        url: `/tasks/${task.id}`,
      });
      await Promise.all(
        subscriptions.map((subscription) => deps.sendPush(subscription, payload)),
      );
      tasksReminded += 1;
    }

    await deps.markReminded(env.FIREBASE_PROJECT_ID, task.id, accessToken);
  }

  return { tasksReminded };
}
