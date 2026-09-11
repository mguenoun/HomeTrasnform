import { useState, type FormEvent } from "react";

export interface ObjectiveFormValues {
  title: string;
  description: string;
  targetDate: string;
}

const EMPTY_VALUES: ObjectiveFormValues = {
  title: "",
  description: "",
  targetDate: "",
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

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Date cible</span>
        <input
          type="date"
          value={values.targetDate}
          onChange={(e) =>
            setValues({ ...values, targetDate: e.target.value })
          }
          className="rounded border border-slate-300 px-3 py-2"
        />
      </label>

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
