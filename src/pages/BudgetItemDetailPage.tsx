import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "../components/Breadcrumb";
import {
  BudgetItemForm,
  type BudgetItemFormValues,
} from "../components/BudgetItemForm";
import {
  BudgetPaymentForm,
  type BudgetPaymentFormValues,
} from "../components/BudgetPaymentForm";
import { BUDGET_CATEGORY_LABELS, BUDGET_PAYMENT_STATUS_LABELS } from "../constants";
import { useAuth } from "../context/AuthContext";
import {
  addPayment,
  computePlanned,
  computeRealized,
  defaultRemainingEstimate,
  effectiveBudget,
  forecastFinal,
  removePayment,
  reviseForecast,
  statusOf,
  updatePayment,
  variance,
} from "../domain/budgetItems";
import { formatMad } from "../domain/money";
import { useBudgetItems } from "../hooks/useBudgetItems";
import { useFamilyUsers } from "../hooks/useFamilyUsers";
import { useObjectives } from "../hooks/useObjectives";
import { useTasks } from "../hooks/useTasks";
import {
  createPaymentId,
  deleteBudgetItem,
  updateBudgetItem,
} from "../services/budgetItems";
import type { BudgetPayment } from "../types";

const STATUS_LABEL: Record<string, string> = {
  over: "Dépassé",
  watch: "À surveiller",
  ok: "Dans les clous",
};

const STATUS_BADGE: Record<string, string> = {
  over: "ht-pill ht-pill-over",
  watch: "ht-pill ht-pill-warn",
  ok: "ht-pill ht-pill-ok",
};

export function BudgetItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items } = useBudgetItems();
  const { objectives } = useObjectives();
  const { tasks } = useTasks();
  const { users } = useFamilyUsers();

  const [editing, setEditing] = useState(false);
  const [editingAdjustments, setEditingAdjustments] = useState(false);
  const [revisedBudgetInput, setRevisedBudgetInput] = useState("");
  const [committedInput, setCommittedInput] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [revisingForecast, setRevisingForecast] = useState(false);
  const [forecastValue, setForecastValue] = useState("");
  const [forecastComment, setForecastComment] = useState("");

  const item = items.find((i) => i.id === id);

  if (!item) {
    return (
      <div className="p-6">
        <p className="text-[var(--ht-text-2)]">
          Rubrique introuvable.
        </p>
        <Link
          to="/budget"
          className="text-sky-700 hover:underline"
        >
          Retour au budget
        </Link>
      </div>
    );
  }

  const objective = objectives.find((o) => o.id === item.objectiveId);
  const task = tasks.find((t) => t.id === item.taskId);
  const userNameById = new Map(users.map((u) => [u.uid, u.displayName]));
  const realized = computeRealized(item);
  const planned = computePlanned(item);
  const budget = effectiveBudget(item);
  const forecast = forecastFinal(item);
  const gap = variance(item);
  const status = statusOf(item);
  const defaultRemaining = defaultRemainingEstimate(item);
  const sortedPayments = [...item.payments].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  async function handleUpdate(values: BudgetItemFormValues) {
    if (!item) return;
    const newObjective = objectives.find((o) => o.id === values.objectiveId);
    await updateBudgetItem(item.id, {
      title: values.title,
      category: values.category,
      objectiveId: values.objectiveId,
      visibility: newObjective?.visibility ?? "shared",
      vendor: values.vendor || undefined,
      budgeted: Number(values.budgeted),
      notes: values.notes || undefined,
    });
    setEditing(false);
  }

  async function handleDelete() {
    if (!item || !window.confirm("Supprimer cette rubrique ?")) return;
    await deleteBudgetItem(item.id);
    navigate("/budget");
  }

  function openAdjustments() {
    if (!item) return;
    setRevisedBudgetInput(item.revisedBudget?.toString() ?? "");
    setCommittedInput(item.committed?.toString() ?? "");
    setEditingAdjustments(true);
  }

  async function handleSaveAdjustments(event: FormEvent) {
    event.preventDefault();
    if (!item) return;
    await updateBudgetItem(item.id, {
      revisedBudget: revisedBudgetInput ? Number(revisedBudgetInput) : null,
      committed: committedInput ? Number(committedInput) : null,
    });
    setEditingAdjustments(false);
  }

  async function handleAddPayment(values: BudgetPaymentFormValues) {
    if (!user || !item) return;
    const payment: BudgetPayment = {
      id: createPaymentId(),
      date: values.date,
      amount: Number(values.amount),
      status: values.status,
      comment: values.comment || undefined,
      progress: values.progress ? Number(values.progress) : undefined,
      createdBy: user.uid,
    };
    await updateBudgetItem(item.id, { payments: addPayment(item, payment) });
    setAddingPayment(false);
  }

  async function handleUpdatePayment(
    paymentId: string,
    values: BudgetPaymentFormValues,
  ) {
    if (!item) return;
    await updateBudgetItem(item.id, {
      payments: updatePayment(item, paymentId, {
        date: values.date,
        amount: Number(values.amount),
        status: values.status,
        comment: values.comment || undefined,
        progress: values.progress ? Number(values.progress) : undefined,
      }),
    });
    setEditingPaymentId(null);
  }

  async function handleDeletePayment(paymentId: string) {
    if (!item || !window.confirm("Supprimer ce paiement ?")) return;
    await updateBudgetItem(item.id, {
      payments: removePayment(item, paymentId),
    });
  }

  function openRevision() {
    if (!item) return;
    setForecastValue((item.remainingEstimate ?? defaultRemaining).toString());
    setForecastComment("");
    setRevisingForecast(true);
  }

  async function handleReviseForecast(event: FormEvent) {
    event.preventDefault();
    if (!user || !item || !forecastValue) return;
    const result = reviseForecast(
      item,
      Number(forecastValue),
      forecastComment || undefined,
      user.uid,
    );
    await updateBudgetItem(item.id, result);
    setRevisingForecast(false);
  }

  const breadcrumbItems = task
    ? [
        { label: "Tableau de bord", to: "/" },
        { label: "Tâches", to: "/tasks" },
        { label: task.title, to: `/tasks/${task.id}` },
        { label: item.title },
      ]
    : objective
      ? [
          { label: "Tableau de bord", to: "/" },
          { label: "Objectifs", to: "/objectives" },
          { label: objective.title, to: `/objectives/${objective.id}` },
          { label: item.title },
        ]
      : [
          { label: "Tableau de bord", to: "/" },
          { label: "Budget", to: "/budget" },
          { label: item.title },
        ];

  return (
    <div className="min-h-screen p-6">
      <Breadcrumb items={breadcrumbItems} />

      {editing ? (
        <div className="mt-4 max-w-md ht-card p-4">
          <BudgetItemForm
            objectives={objectives}
            initialValues={{
              title: item.title,
              category: item.category,
              vendor: item.vendor ?? "",
              budgeted: item.budgeted.toString(),
              objectiveId: item.objectiveId,
              notes: item.notes ?? "",
            }}
            submitLabel="Enregistrer"
            onSubmit={handleUpdate}
          />
        </div>
      ) : (
        <header className="mt-4 mb-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.4px] text-[var(--ht-text)]">
                {item.title}
              </h1>
              <p className="mt-1 text-sm text-[var(--ht-text-2)]">
                {BUDGET_CATEGORY_LABELS[item.category]}
                {item.vendor && ` · ${item.vendor}`}
                {objective && ` · ${objective.title}`}
              </p>
            </div>
            <span
              className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${STATUS_BADGE[status]}`}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
          {item.notes && (
            <p className="mt-2 text-[var(--ht-text-body)]">
              {item.notes}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ht-btn"
            >
              Éditer
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="ht-btn ht-btn-danger"
            >
              Supprimer
            </button>
          </div>
        </header>
      )}

      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="ht-card p-3">
          <p className="ht-kpi-label">Budget</p>
          <p className="mt-1 text-[18px] font-extrabold text-[var(--ht-text)]">
            {formatMad(budget)}
          </p>
        </div>
        <div className="ht-card p-3">
          <p className="ht-kpi-label">Engagé</p>
          <p className="mt-1 text-[18px] font-extrabold text-[var(--ht-text)]">
            {item.committed != null ? formatMad(item.committed) : "—"}
          </p>
        </div>
        <div className="ht-card p-3">
          <p className="ht-kpi-label">Réalisé</p>
          <p className="mt-1 text-[18px] font-extrabold text-[var(--ht-text)]">
            <span className="ht-grad-text">
              {formatMad(realized)}
            </span>
          </p>
        </div>
        <div className="ht-card p-3">
          <p className="ht-kpi-label">Prévu (non payé)</p>
          <p className="mt-1 text-[18px] font-extrabold text-[var(--ht-text)]">
            {formatMad(planned)}
          </p>
        </div>
        <div className="ht-card p-3">
          <p className="ht-kpi-label">Prévision finale</p>
          <p className="mt-1 text-[18px] font-extrabold text-[var(--ht-text)]">
            {formatMad(forecast)}
          </p>
        </div>
        <div className="ht-card p-3">
          <p className="ht-kpi-label">Écart</p>
          <p
            className={`mt-1 text-[18px] font-extrabold ${gap < 0 ? "text-[var(--ht-danger)]" : "text-[var(--ht-text)]"}`}
          >
            {formatMad(gap)}
          </p>
        </div>
      </section>

      <section className="mb-6 ht-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="ht-label">
            Budget révisé et engagement
          </h2>
          {!editingAdjustments && (
            <button
              type="button"
              onClick={openAdjustments}
              className="ht-btn"
            >
              Ajuster
            </button>
          )}
        </div>
        {editingAdjustments ? (
          <form
            onSubmit={handleSaveAdjustments}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[var(--ht-text-body)]">
                Budget révisé (MAD)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={revisedBudgetInput}
                onChange={(e) => setRevisedBudgetInput(e.target.value)}
                className="ht-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[var(--ht-text-body)]">
                Engagé (MAD)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={committedInput}
                onChange={(e) => setCommittedInput(e.target.value)}
                className="ht-input"
              />
            </label>
            <button
              type="submit"
              className="ht-btn-cta"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setEditingAdjustments(false)}
              className="ht-btn"
            >
              Annuler
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-[var(--ht-text-2)]">
            Budget initial {formatMad(item.budgeted)}
            {item.revisedBudget != null &&
              ` · révisé à ${formatMad(item.revisedBudget)}`}
            {item.committed != null && ` · engagé ${formatMad(item.committed)}`}
          </p>
        )}
      </section>

      <section className="mb-6 ht-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="ht-label">
            Prévision à terminaison
          </h2>
          {!revisingForecast && (
            <button
              type="button"
              onClick={openRevision}
              className="ht-btn"
            >
              Réviser
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-[var(--ht-text-2)]">
          Reste à prévoir : {formatMad(item.remainingEstimate ?? defaultRemaining)}
          {item.remainingEstimate == null && " (calculé automatiquement)"}
        </p>

        {revisingForecast && (
          <form
            onSubmit={handleReviseForecast}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[var(--ht-text-body)]">
                Nouveau reste à prévoir (MAD)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={forecastValue}
                onChange={(e) => setForecastValue(e.target.value)}
                className="ht-input"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-[var(--ht-text-body)]">
                Motif
              </span>
              <input
                value={forecastComment}
                onChange={(e) => setForecastComment(e.target.value)}
                className="ht-input"
              />
            </label>
            <button
              type="submit"
              className="ht-btn-cta"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setRevisingForecast(false)}
              className="ht-btn"
            >
              Annuler
            </button>
          </form>
        )}

        {item.forecastHistory.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-[var(--ht-text-2)]">
            {item.forecastHistory.map((revision, index) => (
              <li key={index}>
                {new Date(revision.date).toLocaleDateString("fr-FR")} :{" "}
                {formatMad(revision.previousEstimate)} →{" "}
                {formatMad(revision.newEstimate)}
                {revision.comment && ` — ${revision.comment}`}
                {` (${userNameById.get(revision.userId) ?? "?"})`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ht-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="ht-label">Paiements</h2>
          {!addingPayment && (
            <button
              type="button"
              onClick={() => setAddingPayment(true)}
              className="ht-btn"
            >
              Ajouter un paiement
            </button>
          )}
        </div>

        {addingPayment && (
          <div className="mt-3 max-w-md">
            <BudgetPaymentForm
              onSubmit={handleAddPayment}
              onCancel={() => setAddingPayment(false)}
            />
          </div>
        )}

        <ul className="mt-3 flex flex-col gap-2">
          {sortedPayments.map((payment) =>
            editingPaymentId === payment.id ? (
              <li key={payment.id} className="max-w-md">
                <BudgetPaymentForm
                  initialValues={{
                    date: payment.date,
                    amount: payment.amount.toString(),
                    status: payment.status,
                    comment: payment.comment ?? "",
                    progress: payment.progress?.toString() ?? "",
                  }}
                  submitLabel="Enregistrer"
                  onSubmit={(values) => handleUpdatePayment(payment.id, values)}
                  onCancel={() => setEditingPaymentId(null)}
                />
              </li>
            ) : (
              <li
                key={payment.id}
                className="ht-row flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div>
                  <p className="font-medium text-[var(--ht-text)]">
                    {formatMad(payment.amount)}{" "}
                    <span className="text-xs font-normal text-[var(--ht-text-2)]">
                      {BUDGET_PAYMENT_STATUS_LABELS[payment.status]} ·{" "}
                      {payment.date}
                      {payment.progress != null && ` · ${payment.progress}%`}
                    </span>
                  </p>
                  {payment.comment && (
                    <p className="text-sm text-[var(--ht-text-2)]">
                      {payment.comment}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPaymentId(payment.id)}
                    className="ht-btn"
                  >
                    Éditer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePayment(payment.id)}
                    className="ht-btn ht-btn-danger"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
        {sortedPayments.length === 0 && (
          <p className="mt-3 text-sm text-[var(--ht-text-2)]">
            Aucun paiement pour le moment.
          </p>
        )}
      </section>
    </div>
  );
}
