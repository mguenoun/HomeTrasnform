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
  over: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 dark:ring-1 dark:ring-red-500/30",
  watch:
    "bg-orange-100 text-orange-700 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-1 dark:ring-amber-500/30",
  ok: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400 dark:ring-1 dark:ring-green-500/30",
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
      <div className="p-6 dark:bg-[#0c1628] dark:text-slate-100">
        <p className="text-slate-500 dark:text-slate-400">
          Rubrique introuvable.
        </p>
        <Link
          to="/budget"
          className="text-blue-700 hover:underline dark:text-sky-400"
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
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-[radial-gradient(circle_at_18%_-10%,#16243f_0%,#0c1628_45%,#020408_100%)]">
      <Breadcrumb items={breadcrumbItems} />

      {editing ? (
        <div className="mt-4 max-w-md rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
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
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {item.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
            <p className="mt-2 text-slate-700 dark:text-slate-300">
              {item.notes}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Éditer
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15"
            >
              Supprimer
            </button>
          </div>
        </header>
      )}

      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Budget</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {formatMad(budget)}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Engagé</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {item.committed != null ? formatMad(item.committed) : "—"}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Réalisé</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
            <span className="dark:bg-gradient-to-r dark:from-amber-400 dark:via-orange-500 dark:to-red-500 dark:bg-clip-text dark:text-transparent">
              {formatMad(realized)}
            </span>
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prévu (non payé)</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {formatMad(planned)}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prévision finale</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {formatMad(forecast)}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Écart</p>
          <p
            className={`mt-1 text-lg font-semibold ${gap < 0 ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-slate-50"}`}
          >
            {formatMad(gap)}
          </p>
        </div>
      </section>

      <section className="mb-6 rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-400">
            Budget révisé et engagement
          </h2>
          {!editingAdjustments && (
            <button
              type="button"
              onClick={openAdjustments}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
              <span className="text-sm font-medium dark:text-slate-300">
                Budget révisé (MAD)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={revisedBudgetInput}
                onChange={(e) => setRevisedBudgetInput(e.target.value)}
                className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium dark:text-slate-300">
                Engagé (MAD)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={committedInput}
                onChange={(e) => setCommittedInput(e.target.value)}
                className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
              />
            </label>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 dark:bg-gradient-to-r dark:from-amber-400 dark:via-orange-500 dark:to-red-500 dark:text-slate-950 dark:hover:brightness-105"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setEditingAdjustments(false)}
              className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Annuler
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Budget initial {formatMad(item.budgeted)}
            {item.revisedBudget != null &&
              ` · révisé à ${formatMad(item.revisedBudget)}`}
            {item.committed != null && ` · engagé ${formatMad(item.committed)}`}
          </p>
        )}
      </section>

      <section className="mb-6 rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-400">
            Prévision à terminaison
          </h2>
          {!revisingForecast && (
            <button
              type="button"
              onClick={openRevision}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Réviser
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Reste à prévoir : {formatMad(item.remainingEstimate ?? defaultRemaining)}
          {item.remainingEstimate == null && " (calculé automatiquement)"}
        </p>

        {revisingForecast && (
          <form
            onSubmit={handleReviseForecast}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium dark:text-slate-300">
                Nouveau reste à prévoir (MAD)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={forecastValue}
                onChange={(e) => setForecastValue(e.target.value)}
                className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium dark:text-slate-300">
                Motif
              </span>
              <input
                value={forecastComment}
                onChange={(e) => setForecastComment(e.target.value)}
                className="rounded border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
              />
            </label>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 dark:bg-gradient-to-r dark:from-amber-400 dark:via-orange-500 dark:to-red-500 dark:text-slate-950 dark:hover:brightness-105"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setRevisingForecast(false)}
              className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Annuler
            </button>
          </form>
        )}

        {item.forecastHistory.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
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

      <section className="rounded border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-400">Paiements</h2>
          {!addingPayment && (
            <button
              type="button"
              onClick={() => setAddingPayment(true)}
              className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 p-3 dark:border-white/10"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">
                    {formatMad(payment.amount)}{" "}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      {BUDGET_PAYMENT_STATUS_LABELS[payment.status]} ·{" "}
                      {payment.date}
                      {payment.progress != null && ` · ${payment.progress}%`}
                    </span>
                  </p>
                  {payment.comment && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {payment.comment}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPaymentId(payment.id)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    Éditer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePayment(payment.id)}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
        {sortedPayments.length === 0 && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Aucun paiement pour le moment.
          </p>
        )}
      </section>
    </div>
  );
}
