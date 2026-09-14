import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { TaskComment } from "../types";

function commentsCollection(taskId: string) {
  return collection(db, "tasks", taskId, "comments");
}

export function subscribeToComments(
  taskId: string,
  onChange: (comments: TaskComment[]) => void,
): Unsubscribe {
  const commentsQuery = query(commentsCollection(taskId), orderBy("createdAt"));
  return onSnapshot(commentsQuery, (snapshot) => {
    const comments = snapshot.docs.map(
      (docSnapshot) =>
        ({ id: docSnapshot.id, ...docSnapshot.data() }) as TaskComment,
    );
    onChange(comments);
  });
}

export async function addComment(
  taskId: string,
  text: string,
  authorId: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Le commentaire ne peut pas être vide.");
  }
  await addDoc(commentsCollection(taskId), {
    taskId,
    authorId,
    text: trimmed,
    createdAt: Date.now(),
  });
}
