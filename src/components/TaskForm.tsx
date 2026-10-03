import { useState, type FormEvent } from "react";
import type { Objective, TaskPriority, TaskType } from "../types";

export interface TaskFormValues {
  title: string;
  description: string;
  type: TaskType;
  room: string;
  priority: TaskPriority;
  objectiveId: string | null;
  dueDate: string;
}

const EMPTY_VALUES: TaskFormValues = {
  title: "",
  description: "",
  type: "menage",
  room: "",
  priority: "medium",
  objectiveId: null,
  dueDate: "",
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.title.trim()) {
      setError("Le titre est obligatoire.");
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
        <p
          role="alert"
          className="rounded bg-red-100 px-3 py-2 text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium dark:text-slate-300">Titre</span>
        <input
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium dark:text-slate-300">Description</span>
        <textarea
          value={values.description}
          onChange={(e) =>
            setValues({ ...values, description: e.target.value })
          }
          className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium dark:text-slate-300">Type</span>
          <select
            value={values.type}
            onChange={(e) =>
              setValues({ ...values, type: e.target.value as TaskType })
            }
            className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          >
            <option value="menage">Ménage</option>
            <option value="travaux">Travaux</option>
            <option value="achat">Achat</option>
            <option value="soustraitance">Sous-traitance</option>
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium dark:text-slate-300">Priorité</span>
          <select
            value={values.priority}
            onChange={(e) =>
              setValues({
                ...values,
                priority: e.target.value as TaskPriority,
              })
            }
            className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          >
            <option value="low">Basse</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>
        </label>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium dark:text-slate-300">Pièce</span>
          <input
            value={values.room}
            onChange={(e) => setValues({ ...values, room: e.target.value })}
            className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium dark:text-slate-300">Échéance</span>
          <input
            type="date"
            value={values.dueDate}
            onChange={(e) => setValues({ ...values, dueDate: e.target.value })}
            className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:[color-scheme:dark]"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium dark:text-slate-300">Objectif</span>
        <select
          value={values.objectiveId ?? ""}
          onChange={(e) =>
            setValues({
              ...values,
              objectiveId: e.target.value === "" ? null : e.target.value,
            })
          }
          className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
        >
          <option value="">Tâche libre (aucun objectif)</option>
          {objectives.map((objective) => (
            <option key={objective.id} value={objective.id}>
              {objective.title}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 px-4 py-2 font-medium text-slate-950 hover:brightness-105 disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
