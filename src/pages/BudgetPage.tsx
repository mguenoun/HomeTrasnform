import { Breadcrumb } from "../components/Breadcrumb";
import { BudgetItemsTable } from "../components/BudgetItemsTable";
import { statusOf, summarizeBudgetItems } from "../domain/budgetItems";
import { formatMad } from "../domain/money";
import { useBudgetItems } from "../hooks/useBudgetItems";

const STATUS_RANK: Record<string, number> = { over: 0, watch: 1, ok: 2 };

export function BudgetPage() {
  const { items, loading } = useBudgetItems();

  const totals = summarizeBudgetItems(items);
  const sortedItems = [...items].sort((a, b) => {
    const rank = STATUS_RANK[statusOf(a)] - STATUS_RANK[statusOf(b)];
    return rank !== 0 ? rank : a.title.localeCompare(b.title);
  });

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
          <section className="mb-6 grid grid-cols-2 gap-4">
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
          </section>

          <BudgetItemsTable
            title="Rubriques"
            items={sortedItems}
            addHref="/budget/new"
          />
        </>
      )}
    </div>
  );
}
