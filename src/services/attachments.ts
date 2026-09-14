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
import type { TaskAttachment } from "../types";
import { resizeImageIfNeeded } from "./imageResize";

function attachmentsCollection(taskId: string) {
  return collection(db, "tasks", taskId, "attachments");
}

function chunksCollection(taskId: string, attachmentId: string) {
  return collection(
    db,
    "tasks",
    taskId,
    "attachments",
    attachmentId,
    "chunks",
  );
}

export function subscribeToAttachments(
  taskId: string,
  onChange: (attachments: TaskAttachment[]) => void,
): Unsubscribe {
  return onSnapshot(attachmentsCollection(taskId), (snapshot) => {
    const attachments = snapshot.docs.map(
      (docSnapshot) =>
        ({ id: docSnapshot.id, ...docSnapshot.data() }) as TaskAttachment,
    );
    onChange(attachments);
  });
}

export async function uploadAttachment(
  taskId: string,
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

  const attachmentRef = doc(attachmentsCollection(taskId));
  const batch = writeBatch(db);

  batch.set(attachmentRef, {
    taskId,
    fileName: uploadFile.name,
    contentType: uploadFile.type,
    size: uploadFile.size,
    chunkCount: chunks.length,
    uploadedBy: user.uid,
    uploadedAt: Date.now(),
  });

  chunks.forEach((data, index) => {
    const chunkRef = doc(
      chunksCollection(taskId, attachmentRef.id),
      String(index),
    );
    batch.set(chunkRef, { index, data });
  });

  await batch.commit();
}

export async function downloadAttachment(
  taskId: string,
  attachment: TaskAttachment,
): Promise<void> {
  const chunksQuery = query(
    chunksCollection(taskId, attachment.id),
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

export async function deleteAttachment(
  taskId: string,
  attachment: TaskAttachment,
): Promise<void> {
  const chunksSnapshot = await getDocs(chunksCollection(taskId, attachment.id));
  const batch = writeBatch(db);
  for (const chunkDoc of chunksSnapshot.docs) {
    batch.delete(chunkDoc.ref);
  }
  batch.delete(doc(attachmentsCollection(taskId), attachment.id));
  await batch.commit();
}
