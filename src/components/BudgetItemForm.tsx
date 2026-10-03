import { useState, type FormEvent } from "react";
import { BUDGET_CATEGORY_LABELS } from "../constants";
import type { BudgetCategory, Objective } from "../types";

export interface BudgetItemFormValues {
  title: string;
  category: BudgetCategory;
  vendor: string;
  budgeted: string;
  objectiveId: string | null;
  notes: string;
}

const EMPTY_VALUES: BudgetItemFormValues = {
  title: "",
  category: "materiaux",
  vendor: "",
  budgeted: "",
  objectiveId: null,
  notes: "",
};

const CATEGORIES = Object.keys(BUDGET_CATEGORY_LABELS) as BudgetCategory[];

export interface BudgetItemFormProps {
  objectives: Objective[];
  initialValues?: Partial<BudgetItemFormValues>;
  submitLabel?: string;
  onSubmit: (values: BudgetItemFormValues) => Promise<void> | void;
}

export function BudgetItemForm({
  objectives,
  initialValues,
  submitLabel = "Créer la rubrique",
  onSubmit,
}: BudgetItemFormProps) {
  const [values, setValues] = useState<BudgetItemFormValues>({
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
    if (!values.budgeted || Number(values.budgeted) <= 0) {
      setError("Le budget doit être un montant positif.");
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

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ht-text-body)]">Catégorie</span>
          <select
            value={values.category}
            onChange={(e) =>
              setValues({
                ...values,
                category: e.target.value as BudgetCategory,
              })
            }
            className="ht-input"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {BUDGET_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ht-text-body)]">Budget (MAD)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.budgeted}
            onChange={(e) =>
              setValues({ ...values, budgeted: e.target.value })
            }
            className="ht-input"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ht-text-body)]">Fournisseur / prestataire</span>
        <input
          value={values.vendor}
          onChange={(e) => setValues({ ...values, vendor: e.target.value })}
          className="ht-input"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ht-text-body)]">Objectif</span>
        <select
          value={values.objectiveId ?? ""}
          onChange={(e) =>
            setValues({
              ...values,
              objectiveId: e.target.value === "" ? null : e.target.value,
            })
          }
          className="ht-input"
        >
          <option value="">Rubrique libre (aucun objectif)</option>
          {objectives.map((objective) => (
            <option key={objective.id} value={objective.id}>
              {objective.title}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ht-text-body)]">Notes</span>
        <textarea
          value={values.notes}
          onChange={(e) => setValues({ ...values, notes: e.target.value })}
          className="ht-input"
        />
      </label>

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
