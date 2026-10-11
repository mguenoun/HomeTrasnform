import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { joinChunks, splitIntoChunks, validateFile } from "../domain/attachments";
import { db } from "../firebase/config";
import type {
  BudgetItemAttachment,
  ObjectiveAttachment,
  TaskAttachment,
} from "../types";
import { resizeImageIfNeeded } from "./imageResize";

type AttachmentParent = "tasks" | "objectives" | "budgetItems";

interface StoredAttachment {
  id: string;
  fileName: string;
  contentType: string;
}

function attachmentsCollection(parent: AttachmentParent, parentId: string) {
  return collection(db, parent, parentId, "attachments");
}

function chunksCollection(
  parent: AttachmentParent,
  parentId: string,
  attachmentId: string,
) {
  return collection(
    db,
    parent,
    parentId,
    "attachments",
    attachmentId,
    "chunks",
  );
}

function subscribeToParentAttachments<T>(
  parent: AttachmentParent,
  parentId: string,
  onChange: (attachments: T[]) => void,
): Unsubscribe {
  return onSnapshot(attachmentsCollection(parent, parentId), (snapshot) => {
    const attachments = snapshot.docs.map(
      (docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as T,
    );
    onChange(attachments);
  });
}

async function uploadParentAttachment(
  parent: AttachmentParent,
  parentId: string,
  parentIdField: string,
  file: File,
  user: User,
): Promise<void> {
  // Réduit les photos trop grandes avant tout (une image sous la limite de
  // 10 Mo après redimensionnement passe, même si l'original la dépassait) ;
  // n'a aucun effet sur les PDF ni les images déjà petites.
  const uploadFile = await resizeImageIfNeeded(file);

  const validationError = validateFile(uploadFile.type, uploadFile.size);
  if (validationError) {
    throw new Error(validationError);
  }

  const buffer = await uploadFile.arrayBuffer();
  const chunks = splitIntoChunks(buffer);

  const attachmentRef = doc(attachmentsCollection(parent, parentId));
  const batch = writeBatch(db);

  batch.set(attachmentRef, {
    [parentIdField]: parentId,
    fileName: uploadFile.name,
    contentType: uploadFile.type,
    size: uploadFile.size,
    chunkCount: chunks.length,
    uploadedBy: user.uid,
    uploadedAt: Date.now(),
  });

  chunks.forEach((data, index) => {
    const chunkRef = doc(
      chunksCollection(parent, parentId, attachmentRef.id),
      String(index),
    );
    batch.set(chunkRef, { index, data });
  });

  await batch.commit();
}

async function downloadParentAttachment(
  parent: AttachmentParent,
  parentId: string,
  attachment: StoredAttachment,
): Promise<void> {
  const chunksQuery = query(
    chunksCollection(parent, parentId, attachment.id),
    orderBy("index"),
  );
  const snapshot = await getDocs(chunksQuery);
  const chunks = snapshot.docs.map((d) => d.data().data as string);

  const bytes = joinChunks(chunks);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: attachment.contentType,
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = attachment.fileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

async function deleteParentAttachment(
  parent: AttachmentParent,
  parentId: string,
  attachment: Pick<StoredAttachment, "id">,
): Promise<void> {
  const chunksSnapshot = await getDocs(
    chunksCollection(parent, parentId, attachment.id),
  );
  const batch = writeBatch(db);
  for (const chunkDoc of chunksSnapshot.docs) {
    batch.delete(chunkDoc.ref);
  }
  batch.delete(doc(attachmentsCollection(parent, parentId), attachment.id));
  await batch.commit();
}

// --- Tâches ---

export function subscribeToAttachments(
  taskId: string,
  onChange: (attachments: TaskAttachment[]) => void,
): Unsubscribe {
  return subscribeToParentAttachments<TaskAttachment>(
    "tasks",
    taskId,
    onChange,
  );
}

export async function uploadAttachment(
  taskId: string,
  file: File,
  user: User,
): Promise<void> {
  await uploadParentAttachment("tasks", taskId, "taskId", file, user);
}

export async function downloadAttachment(
  taskId: string,
  attachment: TaskAttachment,
): Promise<void> {
  await downloadParentAttachment("tasks", taskId, attachment);
}

export async function deleteAttachment(
  taskId: string,
  attachment: TaskAttachment,
): Promise<void> {
  await deleteParentAttachment("tasks", taskId, attachment);
}

// --- Objectifs ---

export function subscribeToObjectiveAttachments(
  objectiveId: string,
  onChange: (attachments: ObjectiveAttachment[]) => void,
): Unsubscribe {
  return subscribeToParentAttachments<ObjectiveAttachment>(
    "objectives",
    objectiveId,
    onChange,
  );
}

export async function uploadObjectiveAttachment(
  objectiveId: string,
  file: File,
  user: User,
): Promise<void> {
  await uploadParentAttachment(
    "objectives",
    objectiveId,
    "objectiveId",
    file,
    user,
  );
}

export async function downloadObjectiveAttachment(
  objectiveId: string,
  attachment: ObjectiveAttachment,
): Promise<void> {
  await downloadParentAttachment("objectives", objectiveId, attachment);
}

export async function deleteObjectiveAttachment(
  objectiveId: string,
  attachment: ObjectiveAttachment,
): Promise<void> {
  await deleteParentAttachment("objectives", objectiveId, attachment);
}

// --- Rubriques budgétaires ---

export function subscribeToBudgetItemAttachments(
  budgetItemId: string,
  onChange: (attachments: BudgetItemAttachment[]) => void,
): Unsubscribe {
  return subscribeToParentAttachments<BudgetItemAttachment>(
    "budgetItems",
    budgetItemId,
    onChange,
  );
}

export async function uploadBudgetItemAttachment(
  budgetItemId: string,
  file: File,
  user: User,
): Promise<void> {
  await uploadParentAttachment(
    "budgetItems",
    budgetItemId,
    "budgetItemId",
    file,
    user,
  );
}

export async function downloadBudgetItemAttachment(
  budgetItemId: string,
  attachment: BudgetItemAttachment,
): Promise<void> {
  await downloadParentAttachment("budgetItems", budgetItemId, attachment);
}

export async function deleteBudgetItemAttachment(
  budgetItemId: string,
  attachment: BudgetItemAttachment,
): Promise<void> {
  await deleteParentAttachment("budgetItems", budgetItemId, attachment);
}
