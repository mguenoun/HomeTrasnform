import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { applyStatusChange } from "../domain/taskStatus";
import { db } from "../firebase/config";
import type { Task, TaskPriority, TaskStatus, TaskType } from "../types";

const TASKS_COLLECTION = "tasks";

export interface NewTaskInput {
  title: string;
  description?: string;
  type: TaskType;
  room?: string;
  priority: TaskPriority;
  objectiveId: string | null;
  dueDate?: string;
  createdBy: string;
}

export function subscribeToTasks(
  onChange: (tasks: Task[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, TASKS_COLLECTION), (snapshot) => {
    const tasks = snapshot.docs.map(
      (docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as Task,
    );
    onChange(tasks);
  });
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
    dueDate: input.dueDate ?? null,
    status: "todo" satisfies TaskStatus,
    assigneeIds: [],
    budgetEstimated: null,
    budgetActual: null,
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
      | "dueDate"
      | "budgetEstimated"
      | "budgetActual"
      | "assigneeIds"
    >
  >,
): Promise<void> {
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
    ...changes,
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
