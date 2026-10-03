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
      <div className="p-6">
        <p className="text-[var(--ht-text-2)]">Tâche introuvable.</p>
        <Link to="/tasks" className="ht-link">
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
    <div className="min-h-screen p-6">
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
        <div className="ht-card mt-4 max-w-md p-4">
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
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.3px] text-[var(--ht-text)]">
            {task.title}
          </h1>
          <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--ht-text-3)]">
            {TASK_TYPE_LABELS[task.type]} · {TASK_PRIORITY_LABELS[task.priority]}
            {task.room && ` · ${task.room}`}
            {objectiveTitle && ` · ${objectiveTitle}`}
            {objective?.visibility === "private" && (
              <span className="ht-pill ht-pill-neutral">Privé</span>
            )}
          </p>
          {task.description && (
            <p className="mt-1.5 text-[13px] leading-normal text-[var(--ht-text-body)]">
              {task.description}
            </p>
          )}
          {task.dueDate && (
            <p className="mt-1.5 text-xs text-[var(--ht-text-3)]">
              Échéance : {task.dueDate}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="ht-btn ht-btn-active">
              {TASK_STATUS_LABELS[task.status]}
            </span>
            {ALL_STATUSES.filter((status) =>
              canTransition(task.status, status),
            ).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                className="ht-btn"
              >
                → {TASK_STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          {task.status === "done" && task.closedAt && (
            <p className="mt-2 text-xs text-[var(--ht-text-3)]">
              Clôturée le {new Date(task.closedAt).toLocaleDateString("fr-FR")}
              {task.closedBy &&
                ` par ${userNameById.get(task.closedBy) ?? "?"}`}
            </p>
          )}

          <div className="mt-4">
            <p className="mb-2 ht-label">Assignés</p>
            <div className="flex flex-wrap gap-1.5">
              {assignableUsers.map((familyUser) => {
                const assigned = task.assigneeIds.includes(familyUser.uid);
                return (
                  <button
                    key={familyUser.uid}
                    type="button"
                    onClick={() => toggleAssignee(familyUser.uid)}
                    aria-pressed={assigned}
                    className={assigned ? "ht-chip ht-chip-active" : "ht-chip"}
                  >
                    {familyUser.displayName}
                  </button>
                );
              })}
              {assignableUsers.length === 0 && (
                <p className="text-sm text-[var(--ht-text-3)]">Aucun membre trouvé.</p>
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

          <div className="mt-6">
            <BudgetItemsTable
              title="Rubriques budgétaires"
              items={taskBudgetItems}
              addHref={`/budget/new?taskId=${task.id}`}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="ht-btn">
              Éditer
            </button>
            <button type="button" onClick={handleDelete} className="ht-btn ht-btn-danger">
              Supprimer
            </button>
          </div>
        </header>
      )}
    </div>
  );
}
