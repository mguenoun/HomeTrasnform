import { useState, type FormEvent } from "react";
import { addComment } from "../services/comments";
import type { FamilyUser, TaskComment } from "../types";

export interface CommentsSectionProps {
  taskId: string;
  comments: TaskComment[];
  currentUserId: string;
  users: FamilyUser[];
}

export function CommentsSection({
  taskId,
  comments,
  currentUserId,
  users,
}: CommentsSectionProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const userNameById = new Map(users.map((u) => [u.uid, u.displayName]));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await addComment(taskId, text, currentUserId);
      setText("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'envoi du commentaire.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-slate-700">Commentaires</p>

      <ul className="mt-2 flex flex-col gap-2">
        {comments.map((comment) => (
          <li
            key={comment.id}
            className="rounded border border-slate-200 bg-white p-2 text-sm"
          >
            <p className="text-xs font-medium text-slate-600">
              {userNameById.get(comment.authorId) ?? "?"} ·{" "}
              {new Date(comment.createdAt).toLocaleString("fr-FR")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">
              {comment.text}
            </p>
          </li>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-slate-400">Aucun commentaire.</p>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
        {error && (
          <p role="alert" className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <label className="flex flex-col gap-1">
          <span className="sr-only">Ajouter un commentaire</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ajouter un commentaire..."
            rows={2}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={submitting || text.trim() === ""}
          className="self-start rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
