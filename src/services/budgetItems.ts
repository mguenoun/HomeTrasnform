import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { subscribeSharedOrOwn } from "../firebase/sharedOrOwnSubscription";
import { stripUndefined } from "../firebase/sanitize";
import { getObjectiveVisibility } from "./objectives";
import type { BudgetCategory, BudgetItem } from "../types";

const BUDGET_ITEMS_COLLECTION = "budgetItems";

export interface NewBudgetItemInput {
  title: string;
  category: BudgetCategory;
  objectiveId: string | null;
  // Visibilité héritée de l'objectif référencé — mêmes raisons qu'au même
  // paramètre dans services/tasks.ts.
  visibility: "shared" | "private";
  taskId: string | null;
  vendor?: string;
  budgeted: number;
  notes?: string;
  createdBy: string;
}

export function subscribeToBudgetItems(
  uid: string,
  onChange: (items: BudgetItem[]) => void,
): Unsubscribe {
  return subscribeSharedOrOwn(
    collection(db, BUDGET_ITEMS_COLLECTION),
    uid,
    (docSnapshot) =>
      ({ id: docSnapshot.id, ...docSnapshot.data() }) as BudgetItem,
    onChange,
    (mineDocs) => {
      // Auto-guérison des rubriques créées avant l'ajout de ce champ
      // dénormalisé — même raisonnement que dans subscribeToObjectives.
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

export async function createBudgetItem(input: NewBudgetItemInput): Promise<string> {
  const now = Date.now();
  const docRef = await addDoc(collection(db, BUDGET_ITEMS_COLLECTION), {
    title: input.title,
    category: input.category,
    objectiveId: input.objectiveId,
    visibility: input.visibility,
    taskId: input.taskId,
    vendor: input.vendor ?? "",
    budgeted: input.budgeted,
    revisedBudget: null,
    committed: null,
    remainingEstimate: null,
    forecastHistory: [],
    notes: input.notes ?? "",
    payments: [],
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateBudgetItem(
  itemId: string,
  changes: Partial<
    Pick<
      BudgetItem,
      | "title"
      | "category"
      | "objectiveId"
      | "visibility"
      | "taskId"
      | "vendor"
      | "budgeted"
      | "revisedBudget"
      | "committed"
      | "remainingEstimate"
      | "forecastHistory"
      | "notes"
      | "payments"
    >
  >,
): Promise<void> {
  await updateDoc(doc(db, BUDGET_ITEMS_COLLECTION, itemId), {
    ...stripUndefined(changes),
    updatedAt: Date.now(),
  });
}

export async function deleteBudgetItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, BUDGET_ITEMS_COLLECTION, itemId));
}

export function createPaymentId(): string {
  return crypto.randomUUID();
}
