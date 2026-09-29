import { Breadcrumb } from "../components/Breadcrumb";
import { BudgetItemsTable } from "../components/BudgetItemsTable";
import { statusOf, summarizeBudgetItems } from "../domain/budgetItems";
import { formatMad } from "../domain/money";
import { getPrivateObjectiveIds, isBudgetItemPrivate } from "../domain/visibility";
import { useBudgetItems } from "../hooks/useBudgetItems";
import { useObjectives } from "../hooks/useObjectives";
import type { BudgetItem } from "../types";

const STATUS_RANK: Record<string, number> = { over: 0, watch: 1, ok: 2 };

function sortByStatus(items: BudgetItem[]): BudgetItem[] {
  return [...items].sort((a, b) => {
    const rank = STATUS_RANK[statusOf(a)] - STATUS_RANK[statusOf(b)];
    return rank !== 0 ? rank : a.title.localeCompare(b.title);
  });
}

function BudgetTotalsSummary({
  totals,
}: {
  totals: ReturnType<typeof summarizeBudgetItems>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Budget</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          {formatMad(totals.budgeted)}
        </p>
      </div>
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Engagé</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          {formatMad(totals.committed)}
        </p>
      </div>
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Réalisé</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          {formatMad(totals.realized)}
        </p>
      </div>
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">
          Prévision finale
        </p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          {formatMad(totals.forecast)}
        </p>
      </div>
      <div className="col-span-2 rounded border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Écart</p>
        <p
          className={`mt-1 text-2xl font-semibold ${
            totals.variance < 0 ? "text-red-700" : "text-slate-900"
          }`}
        >
          {formatMad(totals.variance)}
        </p>
      </div>
    </div>
  );
}

export function BudgetPage() {
  const { items, loading: budgetLoading } = useBudgetItems();
  const { objectives, loading: objectivesLoading } = useObjectives();
  const loading = budgetLoading || objectivesLoading;

  const privateObjectiveIds = getPrivateObjectiveIds(objectives);
  const sharedItems = items.filter(
    (b) => !isBudgetItemPrivate(b, privateObjectiveIds),
  );
  const privateItems = items.filter((b) =>
    isBudgetItemPrivate(b, privateObjectiveIds),
  );
  const hasPrivateItems = privateItems.length > 0;

  const sharedTotals = summarizeBudgetItems(sharedItems);
  const privateTotals = summarizeBudgetItems(privateItems);
  const sortedSharedItems = sortByStatus(sharedItems);
  const sortedPrivateItems = sortByStatus(privateItems);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Breadcrumb
        items={[{ label: "Tableau de bord", to: "/" }, { label: "Budget" }]}
      />
      <h1 className="mt-4 mb-6 text-xl font-semibold text-slate-900">
        Budget
      </h1>

      {loading && <p className="text-slate-500">Chargement...</p>}

      {!loading && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-medium text-slate-700">
              Budget partagé
            </h2>
            <BudgetTotalsSummary totals={sharedTotals} />
          </section>

          {hasPrivateItems && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-medium text-slate-700">
                Budget privé
              </h2>
              <BudgetTotalsSummary totals={privateTotals} />
            </section>
          )}

          <div className="mt-6">
            <BudgetItemsTable
              title="Rubriques partagées"
              items={sortedSharedItems}
              addHref="/budget/new"
              emptyMessage="Aucune rubrique budgétaire partagée pour le moment."
            />
          </div>

          {hasPrivateItems && (
            <div className="mt-6">
              <BudgetItemsTable
                title="Rubriques privées"
                items={sortedPrivateItems}
                addHref="/budget/new"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
