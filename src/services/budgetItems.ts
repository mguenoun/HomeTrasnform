import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { stripUndefined } from "../firebase/sanitize";
import type { BudgetCategory, BudgetItem } from "../types";

const BUDGET_ITEMS_COLLECTION = "budgetItems";

export interface NewBudgetItemInput {
  title: string;
  category: BudgetCategory;
  objectiveId: string | null;
  taskId: string | null;
  vendor?: string;
  budgeted: number;
  notes?: string;
  createdBy: string;
}

export function subscribeToBudgetItems(
  onChange: (items: BudgetItem[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, BUDGET_ITEMS_COLLECTION), (snapshot) => {
    const items = snapshot.docs.map(
      (docSnapshot) =>
        ({ id: docSnapshot.id, ...docSnapshot.data() }) as BudgetItem,
    );
    onChange(items);
  });
}

export async function createBudgetItem(input: NewBudgetItemInput): Promise<string> {
  const now = Date.now();
  const docRef = await addDoc(collection(db, BUDGET_ITEMS_COLLECTION), {
    title: input.title,
    category: input.category,
    objectiveId: input.objectiveId,
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
