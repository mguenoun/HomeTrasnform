import { useState, type FormEvent } from "react";
import { isBudgetRequired, isTaskValid } from "../domain/taskStatus";
import type {
  Objective,
  TaskPriority,
  TaskType,
} from "../types";

export interface TaskFormValues {
  title: string;
  description: string;
  type: TaskType;
  room: string;
  priority: TaskPriority;
  objectiveId: string | null;
  dueDate: string;
  budgetEstimated: string;
  budgetActual: string;
}

const EMPTY_VALUES: TaskFormValues = {
  title: "",
  description: "",
  type: "menage",
  room: "",
  priority: "medium",
  objectiveId: null,
  dueDate: "",
  budgetEstimated: "",
  budgetActual: "",
};

export interface TaskFormProps {
  objectives: Objective[];
  initialValues?: Partial<TaskFormValues>;
  submitLabel?: string;
  onSubmit: (values: TaskFormValues) => Promise<void> | void;
}

export function TaskForm({
  objectives,
  initialValues,
  submitLabel = "Créer la tâche",
  onSubmit,
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const budgetRequired = isBudgetRequired(values.type);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = isTaskValid({
      title: values.title,
      type: values.type,
      budgetEstimated: values.budgetEstimated
        ? Number(values.budgetEstimated)
        : undefined,
    });
    if (!validation.valid) {
      setError(validation.error ?? "Formulaire invalide.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Échec de l'enregistrement. Réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded bg-red-100 px-3 py-2 text-red-700">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Titre</span>
        <input
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Description</span>
        <textarea
          value={values.description}
          onChange={(e) =>
            setValues({ ...values, description: e.target.value })
          }
          className="rounded border border-slate-300 px-3 py-2"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Type</span>
          <select
            value={values.type}
            onChange={(e) =>
              setValues({ ...values, type: e.target.value as TaskType })
            }
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="menage">Ménage</option>
            <option value="travaux">Travaux</option>
            <option value="achat">Achat</option>
            <option value="soustraitance">Sous-traitance</option>
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Priorité</span>
          <select
            value={values.priority}
            onChange={(e) =>
              setValues({
                ...values,
                priority: e.target.value as TaskPriority,
              })
            }
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="low">Basse</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>
        </label>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Pièce</span>
          <input
            value={values.room}
            onChange={(e) => setValues({ ...values, room: e.target.value })}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Échéance</span>
          <input
            type="date"
            value={values.dueDate}
            onChange={(e) => setValues({ ...values, dueDate: e.target.value })}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Objectif</span>
        <select
          value={values.objectiveId ?? ""}
          onChange={(e) =>
            setValues({
              ...values,
              objectiveId: e.target.value === "" ? null : e.target.value,
            })
          }
          className="rounded border border-slate-300 px-3 py-2"
        >
          <option value="">Tâche libre (aucun objectif)</option>
          {objectives.map((objective) => (
            <option key={objective.id} value={objective.id}>
              {objective.title}
            </option>
          ))}
        </select>
      </label>

      {budgetRequired && (
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium">
              Budget estimé (MAD) — requis pour ce type de tâche
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.budgetEstimated}
              onChange={(e) =>
                setValues({ ...values, budgetEstimated: e.target.value })
              }
              className="rounded border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium">Budget réel (MAD)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.budgetActual}
              onChange={(e) =>
                setValues({ ...values, budgetActual: e.target.value })
              }
              className="rounded border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
