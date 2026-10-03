import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AttachmentsSection } from "../components/AttachmentsSection";
import { Breadcrumb } from "../components/Breadcrumb";
import { BudgetItemsTable } from "../components/BudgetItemsTable";
import { CommentsSection } from "../components/CommentsSection";
import { TaskForm, type TaskFormValues } from "../components/TaskForm";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "../constants";
import { useAuth } from "../context/AuthContext";
import { canTransition } from "../domain/taskStatus";
import { useAttachments } from "../hooks/useAttachments";
import { useBudgetItems } from "../hooks/useBudgetItems";
import { useComments } from "../hooks/useComments";
import { useFamilyUsers } from "../hooks/useFamilyUsers";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";
import { sendPushNotification } from "../services/push";
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
  const { items: budgetItems } = useBudgetItems();
  const [editing, setEditing] = useState(false);

  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return (
      <div className="p-6 dark:bg-[#0c1628] dark:text-slate-100">
        <p className="text-slate-500 dark:text-slate-400">
          Tâche introuvable.
        </p>
        <Link
          to="/tasks"
          className="text-blue-700 hover:underline dark:text-sky-400"
        >
          Retour aux tâches
        </Link>
      </div>
    );
  }

  async function toggleAssignee(uid: string) {
    if (!task) return;
    const wasAssigned = task.assigneeIds.includes(uid);
    const assigneeIds = wasAssigned
      ? task.assigneeIds.filter((assigneeId) => assigneeId !== uid)
      : [...task.assigneeIds, uid];
    await updateTask(task.id, { assigneeIds });

    if (!wasAssigned && user && uid !== user.uid) {
      const assignedUser = users.find((familyUser) => familyUser.uid === uid);
      if (assignedUser?.pushSubscriptions?.length) {
        sendPushNotification(
          assignedUser.pushSubscriptions,
          {
            title: "Nouvelle tâche assignée",
            body: task.title,
            url: `/tasks/${task.id}`,
          },
          user,
        ).catch(() => {});
      }
    }
  }

  async function handleUpdate(values: TaskFormValues) {
    if (!task) return;
    const newObjective = objectives.find((o) => o.id === values.objectiveId);
    await updateTask(task.id, {
      title: values.title,
      description: values.description,
      type: values.type,
      room: values.room,
      priority: values.priority,
      objectiveId: values.objectiveId,
      visibility: newObjective?.visibility ?? "shared",
      dueDate: values.dueDate || null,
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

  const objective = objectives.find((o) => o.id === task.objectiveId);
  const objectiveTitle = objective?.title;
  const userNameById = new Map(users.map((u) => [u.uid, u.displayName]));
  const taskBudgetItems = budgetItems.filter((b) => b.taskId === task.id);
  // Un objectif privé n'est visible que par son créateur (règles Firestore) :
  // inutile de proposer d'autres assignés, ils ne pourraient de toute façon
  // pas voir la tâche.
  const assignableUsers =
    objective?.visibility === "private"
      ? users.filter((u) => u.uid === objective.createdBy)
      : users;

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-[radial-gradient(circle_at_18%_-10%,#16243f_0%,#0c1628_45%,#020408_100%)]">
      <Breadcrumb
        items={
          objective
            ? [
                { label: "Tableau de bord", to: "/" },
                { label: "Objectifs", to: "/objectives" },
                { label: objective.title, to: `/objectives/${objective.id}` },
                { label: task.title },
              ]
            : [
                { label: "Tableau de bord", to: "/" },
                { label: "Tâches", to: "/tasks" },
                { label: task.title },
              ]
        }
      />

      {editing ? (
        <div className="mt-4 max-w-md rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
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
            }}
            submitLabel="Enregistrer"
            onSubmit={handleUpdate}
          />
        </div>
      ) : (
        <header className="mt-4 mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {task.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {TASK_TYPE_LABELS[task.type]} ·{" "}
            {TASK_PRIORITY_LABELS[task.priority]}
            {task.room && ` · ${task.room}`}
            {objectiveTitle && ` · ${objectiveTitle}`}
            {objective?.visibility === "private" && (
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                Privé
              </span>
            )}
          </p>
          {task.description && (
            <p className="mt-2 text-slate-700 dark:text-slate-300">
              {task.description}
            </p>
          )}
          {task.dueDate && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Échéance : {task.dueDate}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
              {TASK_STATUS_LABELS[task.status]}
            </span>
            {ALL_STATUSES.filter((status) =>
              canTransition(task.status, status),
            ).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                → {TASK_STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          {task.status === "done" && task.closedAt && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Clôturée le {new Date(task.closedAt).toLocaleDateString("fr-FR")}
              {task.closedBy &&
                ` par ${userNameById.get(task.closedBy) ?? "?"}`}
            </p>
          )}

          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
              Assignés
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {assignableUsers.map((familyUser) => {
                const assigned = task.assigneeIds.includes(familyUser.uid);
                return (
                  <button
                    key={familyUser.uid}
                    type="button"
                    onClick={() => toggleAssignee(familyUser.uid)}
                    aria-pressed={assigned}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      assigned
                        ? "border-blue-600 bg-blue-600 text-white dark:border-amber-400 dark:bg-gradient-to-r dark:from-amber-400 dark:via-orange-500 dark:to-red-500 dark:text-slate-950"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                    }`}
                  >
                    {familyUser.displayName}
                  </button>
                );
              })}
              {assignableUsers.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Aucun membre trouvé.
                </p>
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

          <div className="mt-4">
            <BudgetItemsTable
              title="Rubriques budgétaires"
              items={taskBudgetItems}
              addHref={`/budget/new?taskId=${task.id}`}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Éditer
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15"
            >
              Supprimer
            </button>
          </div>
        </header>
      )}
    </div>
  );
}
