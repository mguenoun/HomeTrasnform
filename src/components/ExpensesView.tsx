import { useState, type FormEvent } from "react";
import { summarizeExpenses, toDateInputValue } from "../domain/expenses";
import { DEFAULT_VENDORS, describeGroup, roundOf } from "../domain/mealPlan";
import { formatMad } from "../domain/money";
import { addExpense, HELPER_DAILY_RATE, removeExpense } from "../services/meals";
import type { ExpenseType, HouseholdExpense } from "../types";

const TYPE_LABEL: Record<ExpenseType, string> = {
  groceries: "Courses",
  helper: "Femme de ménage",
};

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return DATE_FORMAT.format(new Date(y, m - 1, d));
}

export function ExpensesView({
  weekId,
  userId,
  expenses,
}: {
  weekId: string;
  userId: string;
  expenses: HouseholdExpense[];
}) {
  const [type, setType] = useState<ExpenseType>("groceries");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [vendor, setVendor] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const summary = summarizeExpenses(expenses);
  const knownVendors = [
    ...new Set([
      ...DEFAULT_VENDORS,
      ...expenses.map((e) => e.vendor).filter((v): v is string => !!v),
    ]),
  ];

  function chooseType(next: ExpenseType) {
    setType(next);
    // Tarif journalier habituel pré-rempli, modifiable.
    setAmount(next === "helper" ? String(HELPER_DAILY_RATE) : "");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await addExpense({
        type,
        amount: Number(amount),
        date,
        weekId,
        vendor,
        note,
        createdBy: userId,
      });
      setAmount(type === "helper" ? String(HELPER_DAILY_RATE) : "");
      setNote("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'enregistrement.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="ht-card p-3">
          <p className="ht-label">Total</p>
          <p className="mt-1 text-base font-extrabold text-[var(--ht-text)]">
            {formatMad(summary.total)}
          </p>
        </div>
        <div className="ht-card p-3">
          <p className="ht-label">Courses</p>
          <p className="mt-1 text-base font-extrabold text-[var(--ht-text)]">
            {formatMad(summary.groceries)}
          </p>
        </div>
        <div className="ht-card p-3">
          <p className="ht-label">Ménage</p>
          <p className="mt-1 text-base font-extrabold text-[var(--ht-text)]">
            {formatMad(summary.helper)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="ht-card flex flex-col gap-2 p-4">
        <div role="radiogroup" aria-label="Type de dépense" className="flex gap-2">
          {(Object.keys(TYPE_LABEL) as ExpenseType[]).map((key) => (
            <label key={key} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="expense-type"
                checked={type === key}
                onChange={() => chooseType(key)}
              />
              {TYPE_LABEL[key]}
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant (MAD)"
            aria-label="Montant"
            className="ht-input sm:w-36"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date"
            className="ht-input sm:w-40"
          />
          {type === "groceries" && (
            <>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Point de vente"
                aria-label="Point de vente du paiement"
                list="expense-vendors"
                className="ht-input sm:w-44"
              />
              <datalist id="expense-vendors">
                {knownVendors.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </>
          )}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (ex. lait et yaourt)"
            aria-label="Note"
            dir="auto"
            className="ht-input flex-1"
          />
          <button type="submit" className="ht-btn-cta-sm">
            Enregistrer
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-[var(--ht-danger)]">
            {error}
          </p>
        )}
      </form>

      {summary.byVendor.length > 0 && (
        <section className="ht-card p-4">
          <h3 className="mb-1 text-sm font-extrabold text-[var(--ht-text)]">
            Courses par point de vente
          </h3>
          <ul className="text-sm text-[var(--ht-text)]">
            {summary.byVendor.map((v) => (
              <li key={v.vendor} className="flex justify-between py-0.5">
                <span>
                  {v.vendor || "Sans point de vente"}
                  {v.payments > 1 && (
                    <span className="text-[var(--ht-text-2)]">
                      {" "}
                      ({v.payments} paiements)
                    </span>
                  )}
                </span>
                <span>{formatMad(v.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {expenses.length === 0 ? (
        <p className="text-[var(--ht-text-2)]">
          Aucune dépense enregistrée cette semaine.
        </p>
      ) : (
        <ul className="ht-card divide-y divide-[var(--ht-input-border)]">
          {expenses.map((expense) => (
            <li key={expense.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-24 shrink-0 text-xs text-[var(--ht-text-2)]">
                {formatDate(expense.date)}
              </span>
              <span dir="auto" className="min-w-0 flex-1 break-words text-sm text-[var(--ht-text)]">
                {expense.type === "helper"
                  ? TYPE_LABEL.helper
                  : expense.vendor
                    ? describeGroup(expense.vendor, roundOf(expense))
                    : TYPE_LABEL.groceries}
                {expense.note && (
                  <span className="text-[var(--ht-text-2)]"> — {expense.note}</span>
                )}
              </span>
              <span className="text-sm font-semibold text-[var(--ht-text)]">
                {formatMad(expense.amount)}
              </span>
              <button
                type="button"
                aria-label={`Supprimer le paiement de ${formatMad(expense.amount)}`}
                onClick={() => void removeExpense(expense.id)}
                className="text-[var(--ht-text-2)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
