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
      <p className="text-sm font-medium text-slate-700">Pièces jointes</p>

      {error && (
        <p role="alert" className="mt-1 rounded bg-red-100 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <ul className="mt-2 flex flex-col gap-2">
        {attachments.map((attachment) => (
          <li
            key={attachment.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2 text-sm"
          >
            <div>
              <p className="font-medium text-slate-900">
                {attachment.fileName}
              </p>
              <p className="text-xs text-slate-500">
                {formatFileSize(attachment.size)} ·{" "}
                {userNameById.get(attachment.uploadedBy) ?? "?"} ·{" "}
                {new Date(attachment.uploadedAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDownload(attachment)}
                className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
              >
                Télécharger
              </button>
              <button
                type="button"
                onClick={() => handleDelete(attachment)}
                className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
        {attachments.length === 0 && (
          <p className="text-sm text-slate-400">Aucune pièce jointe.</p>
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
          className="text-sm text-slate-600 file:mr-3 file:rounded file:border file:border-slate-300 file:bg-white file:px-3 file:py-1 file:text-sm file:hover:bg-slate-100 disabled:opacity-50"
        />
      </label>
      {uploading && (
        <p className="mt-1 text-xs text-slate-500">Envoi en cours...</p>
      )}
    </div>
  );
}
