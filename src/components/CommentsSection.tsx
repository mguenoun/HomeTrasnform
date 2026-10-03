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
      <p className="mb-2 ht-label">Commentaires</p>

      <ul className="flex flex-col gap-2">
        {comments.map((comment) => (
          <li key={comment.id} className="ht-card p-3.5">
            <p className="text-[11.5px] text-[var(--ht-text-3)]">
              {userNameById.get(comment.authorId) ?? "?"} ·{" "}
              {new Date(comment.createdAt).toLocaleString("fr-FR")}
            </p>
            <p className="mt-1.5 text-[13px] leading-normal whitespace-pre-wrap text-[var(--ht-text-body)]">
              {comment.text}
            </p>
          </li>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-[var(--ht-text-3)]">Aucun commentaire.</p>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-2.5 flex flex-col gap-2">
        {error && (
          <p role="alert" className="ht-pill ht-pill-over self-start">
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
            className="ht-input"
          />
        </label>
        <button
          type="submit"
          disabled={submitting || text.trim() === ""}
          className="ht-btn-cta-sm self-start disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
