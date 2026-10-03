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
          className="rounded bg-[var(--ht-over-bg)] px-3 py-2 text-[var(--ht-danger)]"
        >
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ht-text-body)]">Titre</span>
        <input
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
          className="ht-input"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ht-text-body)]">
          Description
        </span>
        <textarea
          value={values.description}
          onChange={(e) =>
            setValues({ ...values, description: e.target.value })
          }
          className="ht-input"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ht-text-body)]">
          Date cible
        </span>
        <input
          type="date"
          value={values.targetDate}
          onChange={(e) =>
            setValues({ ...values, targetDate: e.target.value })
          }
          className="ht-input"
        />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium text-[var(--ht-text-body)]">
          Visibilité
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="visibility"
            checked={values.visibility === "shared"}
            onChange={() => setValues({ ...values, visibility: "shared" })}
          />
          Partagé avec la famille
        </label>
        <label className="flex items-center gap-2 text-sm">
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
        className="self-start ht-btn-cta disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
