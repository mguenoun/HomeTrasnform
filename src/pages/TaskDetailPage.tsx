import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AttachmentsSection } from "../components/AttachmentsSection";
import { CommentsSection } from "../components/CommentsSection";
import { TaskForm, type TaskFormValues } from "../components/TaskForm";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "../constants";
import { useAuth } from "../context/AuthContext";
import { summarizeTaskBudget } from "../domain/budget";
import { canTransition } from "../domain/taskStatus";
import { useAttachments } from "../hooks/useAttachments";
import { useComments } from "../hooks/useComments";
import { useFamilyUsers } from "../hooks/useFamilyUsers";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";
import { changeTaskStatus, deleteTask, updateTask } from "../services/tasks";
import type { TaskStatus } from "../types";

const ALL_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks } = useTasks();
  const { objectives } = useObjectives();
  const { users } = useFamilyUsers();
  const { attachments } = useAttachments(id);
  const { comments } = useComments(id);
  const [editing, setEditing] = useState(false);

  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Tâche introuvable.</p>
        <Link to="/tasks" className="text-blue-700 hover:underline">
          Retour aux tâches
        </Link>
      </div>
    );
  }

  async function toggleAssignee(uid: string) {
    if (!task) return;
    const assigneeIds = task.assigneeIds.includes(uid)
      ? task.assigneeIds.filter((assigneeId) => assigneeId !== uid)
      : [...task.assigneeIds, uid];
    await updateTask(task.id, { assigneeIds });
  }

  async function handleUpdate(values: TaskFormValues) {
    if (!task) return;
    await updateTask(task.id, {
      title: values.title,
      description: values.description,
      type: values.type,
      room: values.room,
      priority: values.priority,
      objectiveId: values.objectiveId,
      dueDate: values.dueDate || null,
      budgetEstimated: values.budgetEstimated
        ? Number(values.budgetEstimated)
        : null,
      budgetActual: values.budgetActual
        ? Number(values.budgetActual)
        : null,
    });
    setEditing(false);
  }

  async function handleStatusChange(to: TaskStatus) {
    if (!task || !user) return;
    await changeTaskStatus(task, to, user.uid);
  }

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm("Supprimer cette tâche ?")) return;
    await deleteTask(task.id);
    navigate("/tasks");
  }

  const objectiveTitle = objectives.find(
    (o) => o.id === task.objectiveId,
  )?.title;
  const budgetSummary = summarizeTaskBudget(task);
  const userNameById = new Map(users.map((u) => [u.uid, u.displayName]));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Link to="/tasks" className="text-sm text-blue-700 hover:underline">
        ← Tâches
      </Link>

      {editing ? (
        <div className="mt-4 max-w-md rounded border border-slate-200 bg-white p-4">
          <TaskForm
            objectives={objectives}
            initialValues={{
              title: task.title,
              description: task.description ?? "",
              type: task.type,
              room: task.room ?? "",
              priority: task.priority,
              objectiveId: task.objectiveId,
              dueDate: task.dueDate ?? "",
              budgetEstimated: task.budgetEstimated?.toString() ?? "",
              budgetActual: task.budgetActual?.toString() ?? "",
            }}
            submitLabel="Enregistrer"
            onSubmit={handleUpdate}
          />
        </div>
      ) : (
        <header className="mt-4 mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            {task.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {TASK_TYPE_LABELS[task.type]} ·{" "}
            {TASK_PRIORITY_LABELS[task.priority]}
            {task.room && ` · ${task.room}`}
            {objectiveTitle && ` · ${objectiveTitle}`}
          </p>
          {task.description && (
            <p className="mt-2 text-slate-700">{task.description}</p>
          )}
          {task.dueDate && (
            <p className="mt-2 text-sm text-slate-500">
              Échéance : {task.dueDate}
            </p>
          )}
          {(task.budgetEstimated || task.budgetActual) && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>
                Budget estimé : {task.budgetEstimated ?? 0} € · Budget réel :{" "}
                {task.budgetActual ?? 0} €
              </span>
              {budgetSummary.overBudget && (
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Dépassement de budget
                </span>
              )}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700">
              {TASK_STATUS_LABELS[task.status]}
            </span>
            {ALL_STATUSES.filter((status) =>
              canTransition(task.status, status),
            ).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
              >
                → {TASK_STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          {task.status === "done" && task.closedAt && (
            <p className="mt-2 text-xs text-slate-400">
              Clôturée le {new Date(task.closedAt).toLocaleDateString("fr-FR")}
              {task.closedBy &&
                ` par ${userNameById.get(task.closedBy) ?? "?"}`}
            </p>
          )}

          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700">Assignés</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {users.map((familyUser) => {
                const assigned = task.assigneeIds.includes(familyUser.uid);
                return (
                  <button
                    key={familyUser.uid}
                    type="button"
                    onClick={() => toggleAssignee(familyUser.uid)}
                    aria-pressed={assigned}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      assigned
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {familyUser.displayName}
                  </button>
                );
              })}
              {users.length === 0 && (
                <p className="text-sm text-slate-400">Aucun membre trouvé.</p>
              )}
            </div>
          </div>

          {user && (
            <AttachmentsSection
              taskId={task.id}
              attachments={attachments}
              currentUser={user}
              users={users}
            />
          )}

          {user && (
            <CommentsSection
              taskId={task.id}
              comments={comments}
              currentUserId={user.uid}
              users={users}
            />
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
            >
              Éditer
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
            >
              Supprimer
            </button>
          </div>
        </header>
      )}
    </div>
  );
}
