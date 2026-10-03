import { Breadcrumb } from "../components/Breadcrumb";
import { PaymentsHistogram } from "../components/PaymentsHistogram";
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
      <div className="ht-card p-4">
        <p className="ht-label">
          Budget
        </p>
        <p className="mt-1 ht-kpi-value">
          {formatMad(totals.budgeted)}
        </p>
      </div>
      <div className="ht-card p-4">
        <p className="ht-label">
          Engagé
        </p>
        <p className="mt-1 ht-kpi-value">
          {formatMad(totals.committed)}
        </p>
      </div>
      <div className="ht-card p-4">
        <p className="ht-label">
          Réalisé
        </p>
        <p className="mt-1 ht-kpi-value">
          <span className="ht-grad-text">
            {formatMad(totals.realized)}
          </span>
        </p>
      </div>
      <div className="ht-card p-4">
        <p className="ht-label">
          Prévision finale
        </p>
        <p className="mt-1 ht-kpi-value">
          {formatMad(totals.forecast)}
        </p>
      </div>
      <div className="col-span-2 ht-card p-4">
        <p className="ht-label">
          Écart
        </p>
        <p
          className={`mt-1 ht-kpi-value ${
            totals.variance < 0
              ? "text-[var(--ht-danger)]"
              : "text-[var(--ht-text)]"
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
    <div className="min-h-screen p-6">
      <Breadcrumb
        items={[{ label: "Tableau de bord", to: "/" }, { label: "Budget" }]}
      />
      <h1 className="mt-4 mb-5 ht-h1">
        Budget
      </h1>

      {loading && (
        <p className="text-[var(--ht-text-2)]">Chargement...</p>
      )}

      {!loading && (
        <>
          <section>
            <h2 className="mb-2.5 ht-label">
              Budget partagé
            </h2>
            <BudgetTotalsSummary totals={sharedTotals} />
          </section>

          {hasPrivateItems && (
            <section className="mt-6">
              <h2 className="mb-2.5 ht-label">
                Budget privé
              </h2>
              <BudgetTotalsSummary totals={privateTotals} />
            </section>
          )}

          <div className="mt-6">
            <PaymentsHistogram items={items} />
          </div>

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
