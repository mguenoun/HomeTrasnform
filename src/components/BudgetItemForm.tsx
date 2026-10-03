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

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium dark:text-slate-300">Catégorie</span>
          <select
            value={values.category}
            onChange={(e) =>
              setValues({
                ...values,
                category: e.target.value as BudgetCategory,
              })
            }
            className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {BUDGET_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium dark:text-slate-300">Budget (MAD)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.budgeted}
            onChange={(e) =>
              setValues({ ...values, budgeted: e.target.value })
            }
            className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium dark:text-slate-300">Fournisseur / prestataire</span>
        <input
          value={values.vendor}
          onChange={(e) => setValues({ ...values, vendor: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
        />
      </label>

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
          <option value="">Rubrique libre (aucun objectif)</option>
          {objectives.map((objective) => (
            <option key={objective.id} value={objective.id}>
              {objective.title}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium dark:text-slate-300">Notes</span>
        <textarea
          value={values.notes}
          onChange={(e) => setValues({ ...values, notes: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
        />
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
