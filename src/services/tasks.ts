import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { applyStatusChange } from "../domain/taskStatus";
import { db } from "../firebase/config";
import { subscribeSharedOrOwn } from "../firebase/sharedOrOwnSubscription";
import { stripUndefined } from "../firebase/sanitize";
import { getObjectiveVisibility } from "./objectives";
import type { Task, TaskPriority, TaskStatus, TaskType } from "../types";

const TASKS_COLLECTION = "tasks";

export interface NewTaskInput {
  title: string;
  description?: string;
  type: TaskType;
  room?: string;
  priority: TaskPriority;
  objectiveId: string | null;
  // Visibilité héritée de l'objectif référencé (voir Task.visibility) — à la
  // charge de l'appelant, qui a déjà la liste des objectifs sous la main
  // (évite une lecture Firestore supplémentaire ici à chaque création). La
  // règle Firestore revérifie de toute façon que la valeur envoyée est
  // correcte, donc une erreur ici est rejetée, jamais une fuite silencieuse.
  visibility: "shared" | "private";
  dueDate?: string;
  createdBy: string;
}

export function subscribeToTasks(
  uid: string,
  onChange: (tasks: Task[]) => void,
): Unsubscribe {
  return subscribeSharedOrOwn(
    collection(db, TASKS_COLLECTION),
    uid,
    (docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as Task,
    onChange,
    (mineDocs) => {
      // Auto-guérison des tâches créées avant l'ajout de ce champ dénormalisé
      // — même raisonnement que dans subscribeToObjectives.
      for (const docSnapshot of mineDocs) {
        const data = docSnapshot.data();
        if (data.visibility == null) {
          void getObjectiveVisibility(data.objectiveId ?? null).then(
            (visibility) => updateDoc(docSnapshot.ref, { visibility }),
          );
        }
      }
    },
  );
}

export async function createTask(input: NewTaskInput): Promise<string> {
  const now = Date.now();
  const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
    title: input.title,
    description: input.description ?? "",
    type: input.type,
    room: input.room ?? "",
    priority: input.priority,
    objectiveId: input.objectiveId,
    visibility: input.visibility,
    dueDate: input.dueDate ?? null,
    status: "todo" satisfies TaskStatus,
    assigneeIds: [],
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateTask(
  taskId: string,
  changes: Partial<
    Pick<
      Task,
      | "title"
      | "description"
      | "type"
      | "room"
      | "priority"
      | "objectiveId"
      | "visibility"
      | "dueDate"
      | "assigneeIds"
    >
  >,
): Promise<void> {
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
    ...stripUndefined(changes),
    // Une nouvelle échéance doit pouvoir redéclencher un rappel push.
    ...("dueDate" in changes ? { dueReminderSentAt: null } : {}),
    updatedAt: Date.now(),
  });
}

export async function changeTaskStatus(
  task: Pick<Task, "id" | "status">,
  to: TaskStatus,
  actorId: string,
): Promise<void> {
  const result = applyStatusChange(task, to, actorId);
  await updateDoc(doc(db, TASKS_COLLECTION, task.id), {
    ...result,
    updatedAt: Date.now(),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
}
