import type { User } from "firebase/auth";
import { useRef, useState } from "react";
import {
  deleteAttachment,
  downloadAttachment,
  uploadAttachment,
} from "../services/attachments";
import type { FamilyUser, TaskAttachment } from "../types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export interface AttachmentsSectionProps {
  taskId: string;
  attachments: TaskAttachment[];
  currentUser: User;
  users: FamilyUser[];
}

export function AttachmentsSection({
  taskId,
  attachments,
  currentUser,
  users,
}: AttachmentsSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userNameById = new Map(users.map((u) => [u.uid, u.displayName]));

  async function handleFilesSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        await uploadAttachment(taskId, file, currentUser);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDownload(attachment: TaskAttachment) {
    try {
      await downloadAttachment(taskId, attachment);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec du téléchargement.",
      );
    }
  }

  async function handleDelete(attachment: TaskAttachment) {
    if (!window.confirm(`Supprimer "${attachment.fileName}" ?`)) return;
    try {
      await deleteAttachment(taskId, attachment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la suppression.");
    }
  }

  return (
    <div className="mt-4">
      <p className="mb-2 ht-label">Pièces jointes</p>

      {error && (
        <p role="alert" className="ht-pill ht-pill-over mb-2">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {attachments.map((attachment) => (
          <li
            key={attachment.id}
            className="ht-row flex flex-wrap items-center justify-between gap-2 p-2.5"
          >
            <div>
              <p className="ht-title text-[13px]">{attachment.fileName}</p>
              <p className="text-[11px] text-[var(--ht-text-3)]">
                {formatFileSize(attachment.size)} ·{" "}
                {userNameById.get(attachment.uploadedBy) ?? "?"} ·{" "}
                {new Date(attachment.uploadedAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDownload(attachment)}
                className="ht-btn"
              >
                Télécharger
              </button>
              <button
                type="button"
                onClick={() => handleDelete(attachment)}
                className="ht-btn ht-btn-danger"
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
        {attachments.length === 0 && (
          <p className="text-sm text-[var(--ht-text-3)]">Aucune pièce jointe.</p>
        )}
      </ul>

      <label className="mt-3 inline-block">
        <span className="sr-only">Ajouter des pièces jointes</span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={handleFilesSelected}
          disabled={uploading}
          className="text-sm text-[var(--ht-text-2)] file:mr-3 file:ht-btn disabled:opacity-50"
        />
      </label>
      {uploading && (
        <p className="mt-1 text-xs text-[var(--ht-text-2)]">Envoi en cours...</p>
      )}
    </div>
  );
}
