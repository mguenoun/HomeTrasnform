import { useNavigate, useSearchParams } from "react-router-dom";
import { Breadcrumb } from "../components/Breadcrumb";
import { TaskForm, type TaskFormValues } from "../components/TaskForm";
import { useAuth } from "../context/AuthContext";
import { useObjectives } from "../hooks/useObjectives";
import { createTask } from "../services/tasks";

export function TaskCreatePage() {
  const { user } = useAuth();
  const { objectives } = useObjectives();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedObjectiveId = searchParams.get("objectiveId");
  const preselectedObjective = objectives.find(
    (o) => o.id === preselectedObjectiveId,
  );

  async function handleCreate(values: TaskFormValues) {
    if (!user) return;
    const objective = objectives.find((o) => o.id === values.objectiveId);
    const id = await createTask({
      title: values.title,
      description: values.description,
      type: values.type,
      room: values.room,
      priority: values.priority,
      objectiveId: values.objectiveId,
      visibility: objective?.visibility ?? "shared",
      dueDate: values.dueDate || undefined,
      createdBy: user.uid,
    });
    navigate(`/tasks/${id}`);
  }

  return (
    <div className="min-h-screen bg-[#f7f5f1] p-6 dark:bg-[radial-gradient(circle_at_18%_-10%,#16243f_0%,#0c1628_45%,#020408_100%)]">
      <Breadcrumb
        items={
          preselectedObjective
            ? [
                { label: "Tableau de bord", to: "/" },
                { label: "Objectifs", to: "/objectives" },
                {
                  label: preselectedObjective.title,
                  to: `/objectives/${preselectedObjective.id}`,
                },
                { label: "Nouvelle tâche" },
              ]
            : [
                { label: "Tableau de bord", to: "/" },
                { label: "Tâches", to: "/tasks" },
                { label: "Nouvelle tâche" },
              ]
        }
      />
      <h1 className="mt-4 mb-6 text-xl font-semibold text-slate-900 dark:text-slate-50">
        Nouvelle tâche
      </h1>
      <div className="max-w-md rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <TaskForm
          objectives={objectives}
          initialValues={
            preselectedObjectiveId
              ? { objectiveId: preselectedObjectiveId }
              : undefined
          }
          onSubmit={handleCreate}
        />
      </div>
    </div>
  );
}
