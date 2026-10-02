import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { stripUndefined } from "../firebase/sanitize";
import { subscribeSharedOrOwn } from "../firebase/sharedOrOwnSubscription";
import type { Objective, ObjectiveStatus, ObjectiveVisibility } from "../types";

const OBJECTIVES_COLLECTION = "objectives";
const TASKS_COLLECTION = "tasks";
const BUDGET_ITEMS_COLLECTION = "budgetItems";

export interface NewObjectiveInput {
  title: string;
  description?: string;
  targetDate?: string;
  visibility: ObjectiveVisibility;
  createdBy: string;
}

export function subscribeToObjectives(
  uid: string,
  onChange: (objectives: Objective[]) => void,
): Unsubscribe {
  return subscribeSharedOrOwn(
    collection(db, OBJECTIVES_COLLECTION),
    uid,
    (docSnapshot) =>
      ({ id: docSnapshot.id, ...docSnapshot.data() }) as Objective,
    onChange,
    (mineDocs) => {
      // Auto-guérison des objectifs créés avant l'ajout du champ visibility
      // (toujours "shared" à l'époque) : sans ce champ, ils ne remontent plus
      // dans la requête "partagée" (where visibility == 'shared') et
      // disparaissent pour tout le monde sauf leur créateur, le temps que
      // celui-ci les rouvre une fois. Ne concerne que mes propres objectifs
      // (seuls ceux-là passent ici), donc toujours autorisé par les règles.
      for (const docSnapshot of mineDocs) {
        if (docSnapshot.data().visibility == null) {
          void updateDoc(docSnapshot.ref, {
            visibility: "shared" satisfies ObjectiveVisibility,
          });
        }
      }
    },
  );
}

/** Visibilité de l'objectif référencé, "shared" par défaut (pas d'objectif,
 * objectif introuvable, ou champ absent sur un objectif créé avant cette
 * fonctionnalité) — même règle de repli que côté Firestore
 * (voir visibilityOfObjectiveId dans firebase-rules/firestore.rules). */
export async function getObjectiveVisibility(
  objectiveId: string | null,
): Promise<ObjectiveVisibility> {
  if (!objectiveId) return "shared";
  const snapshot = await getDoc(doc(db, OBJECTIVES_COLLECTION, objectiveId));
  return (snapshot.data()?.visibility as ObjectiveVisibility | undefined) ?? "shared";
}

export async function createObjective(
  input: NewObjectiveInput,
): Promise<string> {
  const docRef = await addDoc(collection(db, OBJECTIVES_COLLECTION), {
    title: input.title,
    description: input.description ?? "",
    targetDate: input.targetDate ?? null,
    status: "active" satisfies ObjectiveStatus,
    visibility: input.visibility,
    createdBy: input.createdBy,
    createdAt: Date.now(),
  });
  return docRef.id;
}

export async function updateObjective(
  objectiveId: string,
  changes: Partial<
    Pick<Objective, "title" | "description" | "targetDate" | "visibility">
  >,
): Promise<void> {
  await updateDoc(
    doc(db, OBJECTIVES_COLLECTION, objectiveId),
    stripUndefined(changes),
  );
  // La visibilité des tâches/rubriques d'un objectif est recopiée sur chacune
  // d'elles (voir Task.visibility) : si l'objectif change de visibilité après
  // coup, il faut répercuter le changement, sinon elles gardent l'ancienne
  // valeur (soit elles restent affichées à tort, soit elles disparaissent à
  // tort pour les autres membres).
  if (changes.visibility) {
    await cascadeVisibilityToChildren(objectiveId, changes.visibility);
  }
}

async function cascadeVisibilityToChildren(
  objectiveId: string,
  visibility: ObjectiveVisibility,
): Promise<void> {
  const [linkedTasks, linkedBudgetItems] = await Promise.all([
    getDocs(
      query(
        collection(db, TASKS_COLLECTION),
        where("objectiveId", "==", objectiveId),
      ),
    ),
    getDocs(
      query(
        collection(db, BUDGET_ITEMS_COLLECTION),
        where("objectiveId", "==", objectiveId),
      ),
    ),
  ]);
  if (linkedTasks.empty && linkedBudgetItems.empty) return;

  const batch = writeBatch(db);
  for (const taskDoc of linkedTasks.docs) {
    batch.update(taskDoc.ref, { visibility });
  }
  for (const budgetItemDoc of linkedBudgetItems.docs) {
    batch.update(budgetItemDoc.ref, { visibility });
  }
  await batch.commit();
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
    // Une tâche détachée de son objectif redevient une tâche libre, donc
    // toujours partagée (voir Task.visibility) — sinon une tâche qui était
    // liée à un objectif privé resterait cachée aux autres membres après
    // suppression de cet objectif, sans raison.
    batch.update(taskDoc.ref, {
      objectiveId: null,
      visibility: "shared" satisfies ObjectiveVisibility,
    });
  }
  batch.delete(doc(db, OBJECTIVES_COLLECTION, objectiveId));
  await batch.commit();
}
