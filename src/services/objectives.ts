import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { stripUndefined } from "../firebase/sanitize";
import type { Objective, ObjectiveStatus } from "../types";

const OBJECTIVES_COLLECTION = "objectives";
const TASKS_COLLECTION = "tasks";

export interface NewObjectiveInput {
  title: string;
  description?: string;
  targetDate?: string;
  createdBy: string;
}

export function subscribeToObjectives(
  onChange: (objectives: Objective[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, OBJECTIVES_COLLECTION), (snapshot) => {
    const objectives = snapshot.docs.map(
      (docSnapshot) =>
        ({ id: docSnapshot.id, ...docSnapshot.data() }) as Objective,
    );
    onChange(objectives);
  });
}

export async function createObjective(
  input: NewObjectiveInput,
): Promise<string> {
  const docRef = await addDoc(collection(db, OBJECTIVES_COLLECTION), {
    title: input.title,
    description: input.description ?? "",
    targetDate: input.targetDate ?? null,
    status: "active" satisfies ObjectiveStatus,
    createdBy: input.createdBy,
    createdAt: Date.now(),
  });
  return docRef.id;
}

export async function updateObjective(
  objectiveId: string,
  changes: Partial<Pick<Objective, "title" | "description" | "targetDate">>,
): Promise<void> {
  await updateDoc(
    doc(db, OBJECTIVES_COLLECTION, objectiveId),
    stripUndefined(changes),
  );
}

export async function setObjectiveStatus(
  objectiveId: string,
  status: ObjectiveStatus,
): Promise<void> {
  await updateDoc(doc(db, OBJECTIVES_COLLECTION, objectiveId), { status });
}

export async function deleteObjective(objectiveId: string): Promise<void> {
  const linkedTasks = await getDocs(
    query(
      collection(db, TASKS_COLLECTION),
      where("objectiveId", "==", objectiveId),
    ),
  );

  const batch = writeBatch(db);
  for (const taskDoc of linkedTasks.docs) {
    batch.update(taskDoc.ref, { objectiveId: null });
  }
  batch.delete(doc(db, OBJECTIVES_COLLECTION, objectiveId));
  await batch.commit();
}
