import { useState, type FormEvent } from "react";
import { BUDGET_PAYMENT_STATUS_LABELS } from "../constants";
import type { BudgetPaymentStatus } from "../types";

export interface BudgetPaymentFormValues {
  date: string;
  amount: string;
  status: BudgetPaymentStatus;
  comment: string;
  progress: string;
}

const EMPTY_VALUES: BudgetPaymentFormValues = {
  date: "",
  amount: "",
  status: "paye",
  comment: "",
  progress: "",
};

const STATUSES = Object.keys(
  BUDGET_PAYMENT_STATUS_LABELS,
) as BudgetPaymentStatus[];

export interface BudgetPaymentFormProps {
  initialValues?: Partial<BudgetPaymentFormValues>;
  submitLabel?: string;
  onSubmit: (values: BudgetPaymentFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

export function BudgetPaymentForm({
  initialValues,
  submitLabel = "Ajouter le paiement",
  onSubmit,
  onCancel,
}: BudgetPaymentFormProps) {
  const [values, setValues] = useState<BudgetPaymentFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.date) {
      setError("La date est obligatoire.");
      return;
    }
    if (!values.amount || Number(values.amount) <= 0) {
      setError("Le montant doit être un nombre positif.");
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

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ht-text-body)]">Date</span>
          <input
            type="date"
            value={values.date}
            onChange={(e) => setValues({ ...values, date: e.target.value })}
            className="ht-input"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ht-text-body)]">Montant (MAD)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.amount}
            onChange={(e) => setValues({ ...values, amount: e.target.value })}
            className="ht-input"
          />
        </label>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ht-text-body)]">Statut</span>
          <select
            value={values.status}
            onChange={(e) =>
              setValues({
                ...values,
                status: e.target.value as BudgetPaymentStatus,
              })
            }
            className="ht-input"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {BUDGET_PAYMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-[var(--ht-text-body)]">Avancement (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={values.progress}
            onChange={(e) =>
              setValues({ ...values, progress: e.target.value })
            }
            className="ht-input"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--ht-text-body)]">Commentaire</span>
        <input
          value={values.comment}
          onChange={(e) => setValues({ ...values, comment: e.target.value })}
          className="ht-input"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="self-start ht-btn-cta disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="ht-btn self-start"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
