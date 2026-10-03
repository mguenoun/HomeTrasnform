import { useState, type FormEvent } from "react";
import type { ObjectiveVisibility } from "../types";

export interface ObjectiveFormValues {
  title: string;
  description: string;
  targetDate: string;
  visibility: ObjectiveVisibility;
}

const EMPTY_VALUES: ObjectiveFormValues = {
  title: "",
  description: "",
  targetDate: "",
  visibility: "shared",
};

export interface ObjectiveFormProps {
  initialValues?: Partial<ObjectiveFormValues>;
  submitLabel?: string;
  onSubmit: (values: ObjectiveFormValues) => Promise<void> | void;
}

export function ObjectiveForm({
  initialValues,
  submitLabel = "Créer l'objectif",
  onSubmit,
}: ObjectiveFormProps) {
  const [values, setValues] = useState<ObjectiveFormValues>({
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
        <span className="text-sm font-medium dark:text-slate-300">
          Description
        </span>
        <textarea
          value={values.description}
          onChange={(e) =>
            setValues({ ...values, description: e.target.value })
          }
          className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium dark:text-slate-300">
          Date cible
        </span>
        <input
          type="date"
          value={values.targetDate}
          onChange={(e) =>
            setValues({ ...values, targetDate: e.target.value })
          }
          className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:[color-scheme:dark]"
        />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium dark:text-slate-300">
          Visibilité
        </legend>
        <label className="flex items-center gap-2 text-sm dark:text-slate-300">
          <input
            type="radio"
            name="visibility"
            checked={values.visibility === "shared"}
            onChange={() => setValues({ ...values, visibility: "shared" })}
          />
          Partagé avec la famille
        </label>
        <label className="flex items-center gap-2 text-sm dark:text-slate-300">
          <input
            type="radio"
            name="visibility"
            checked={values.visibility === "private"}
            onChange={() => setValues({ ...values, visibility: "private" })}
          />
          Privé (visible par vous seul, ainsi que ses tâches et rubriques)
        </label>
      </fieldset>

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
