import { useNavigate, useSearchParams } from "react-router-dom";
import { Breadcrumb } from "../components/Breadcrumb";
import {
  BudgetItemForm,
  type BudgetItemFormValues,
} from "../components/BudgetItemForm";
import { useAuth } from "../context/AuthContext";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";
import { createBudgetItem } from "../services/budgetItems";

export function BudgetItemCreatePage() {
  const { user } = useAuth();
  const { objectives } = useObjectives();
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preselectedTaskId = searchParams.get("taskId");
  const preselectedTask = tasks.find((t) => t.id === preselectedTaskId);
  const objectiveId =
    preselectedTask?.objectiveId ?? searchParams.get("objectiveId");
  const preselectedObjective = objectives.find((o) => o.id === objectiveId);

  async function handleCreate(values: BudgetItemFormValues) {
    if (!user) return;
    const objective = objectives.find((o) => o.id === values.objectiveId);
    const id = await createBudgetItem({
      title: values.title,
      category: values.category,
      objectiveId: values.objectiveId,
      visibility: objective?.visibility ?? "shared",
      taskId: preselectedTask?.id ?? null,
      vendor: values.vendor || undefined,
      budgeted: Number(values.budgeted),
      notes: values.notes || undefined,
      createdBy: user.uid,
    });
    navigate(`/budget/${id}`);
  }

  const breadcrumbItems = preselectedTask
    ? [
        { label: "Tableau de bord", to: "/" },
        { label: "Tâches", to: "/tasks" },
        { label: preselectedTask.title, to: `/tasks/${preselectedTask.id}` },
        { label: "Nouvelle rubrique" },
      ]
    : preselectedObjective
      ? [
          { label: "Tableau de bord", to: "/" },
          { label: "Objectifs", to: "/objectives" },
          {
            label: preselectedObjective.title,
            to: `/objectives/${preselectedObjective.id}`,
          },
          { label: "Nouvelle rubrique" },
        ]
      : [
          { label: "Tableau de bord", to: "/" },
          { label: "Budget", to: "/budget" },
          { label: "Nouvelle rubrique" },
        ];

  return (
    <div className="min-h-screen bg-[#f7f5f1] p-6 dark:bg-[radial-gradient(circle_at_18%_-10%,#16243f_0%,#0c1628_45%,#020408_100%)]">
      <Breadcrumb items={breadcrumbItems} />
      <h1 className="mt-4 mb-6 text-xl font-semibold text-slate-900 dark:text-slate-50">
        Nouvelle rubrique
      </h1>
      <div className="max-w-md rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <BudgetItemForm
          objectives={objectives}
          initialValues={objectiveId ? { objectiveId } : undefined}
          onSubmit={handleCreate}
        />
      </div>
    </div>
  );
}
