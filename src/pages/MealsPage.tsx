import { useMemo, useState } from "react";
import { Breadcrumb } from "../components/Breadcrumb";
import { CoveragePanel } from "../components/CoveragePanel";
import { DishLibrary } from "../components/DishLibrary";
import { ExpensesView } from "../components/ExpensesView";
import { MealCalendar } from "../components/MealCalendar";
import { MealWeekPlan } from "../components/MealWeekPlan";
import { ProgramImport } from "../components/ProgramImport";
import { WeeklyFeedback } from "../components/WeeklyFeedback";
import { ShoppingListView } from "../components/ShoppingListView";
import { useAuth } from "../context/AuthContext";
import {
  buildPlanMessage,
  buildShoppingMessage,
  formatWeekRange,
  shiftWeek,
  weekIdOf,
  whatsappUrl,
} from "../domain/mealPlan";
import {
  STATUS_FILTERS,
  countByStatus,
  filterPlan,
  type StatusFilter,
} from "../domain/mealStatus";
import { buildProgramTable } from "../domain/shareTable";
import { buildTranslationIndex } from "../domain/translations";
import { shareTableImage } from "../services/tableImage";
import {
  useDishes,
  useExpenses,
  useIngredients,
  useMealPlan,
  usePantry,
  useShoppingList,
} from "../hooks/useMeals";

type Tab = "plan" | "shopping" | "expenses" | "library";

const TABS: Array<[Tab, string]> = [
  ["plan", "Programme"],
  ["shopping", "Courses"],
  ["expenses", "Dépenses"],
  ["library", "Bibliothèque"],
];

export function MealsPage() {
  const { user } = useAuth();
  const userId = user?.uid ?? "";
  const [weekId, setWeekId] = useState(() => weekIdOf(new Date()));
  const [tab, setTab] = useState<Tab>("plan");
  const [sharingTable, setSharingTable] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  // Programme : vue d'ensemble en calendrier, ou détail jour par jour (saisie).
  const [planView, setPlanView] = useState<"detail" | "calendar">("detail");
  // Vue filtrée sur ce qui est préparé, planifié ou non préparé.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { plan, loading: planLoading } = useMealPlan(weekId);
  const { list, loading: listLoading } = useShoppingList(weekId);
  const { expenses, loading: expensesLoading } = useExpenses(weekId);
  const dishes = useDishes();
  const ingredients = useIngredients();
  const pantry = usePantry();

  // Une traduction appartient au nom : référentiel d'abord (corrigé à la main),
  // puis ce qui est déjà saisi dans le programme et les courses. Un plat traduit
  // une fois l'est partout, sans retaper ni retraduire.
  const translations = useMemo(
    () =>
      buildTranslationIndex([
        ...dishes.map((d) => ({ name: d.name, translation: d.translation })),
        ...ingredients.map((i) => ({ name: i.name, translation: i.translation })),
        ...Object.values(plan.slots).flatMap((slot) =>
          slot.items.map((it) => ({ name: it.label, translation: it.translation })),
        ),
        ...Object.values(list.items).map((i) => ({
          name: i.name,
          translation: i.translation,
        })),
      ]),
    [dishes, ingredients, plan, list],
  );

  // Tap sur un jour du calendrier : on affiche le détail, puis on y défile une
  // fois le détail rendu (la section du jour n'existe pas avant).
  function openDay(dayKey: string) {
    setPlanView("detail");
    setTimeout(() => {
      document
        .getElementById(`day-${dayKey}`)
        ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
  }

  const counts = countByStatus(plan);

  const shareable = tab === "plan" || tab === "shopping";
  const shareMessage =
    tab === "plan"
      ? buildPlanMessage(plan, translations)
      : buildShoppingMessage(Object.values(list.items), translations);
  async function shareAsTable() {
    setShareError(null);
    setSharingTable(true);
    try {
      await shareTableImage(
        buildProgramTable(plan, translations),
        `programme-${weekId}.png`,
      );
    } catch (err) {
      setShareError(
        err instanceof Error ? err.message : "Impossible de créer l'image.",
      );
    } finally {
      setSharingTable(false);
    }
  }
  const hasContent =
    tab === "plan"
      ? Object.values(plan.slots).some((slot) => slot.items.length > 0)
      : Object.keys(list.items).length > 0;
  const loading =
    tab === "plan"
      ? planLoading
      : tab === "shopping"
        ? listLoading || expensesLoading
        : tab === "expenses"
          ? expensesLoading
          : false;

  return (
    <div className="min-h-screen p-6">
      <Breadcrumb
        items={[{ label: "Tableau de bord", to: "/" }, { label: "Repas" }]}
      />
      <h1 className="mt-4 mb-4 ht-h1">Repas &amp; courses</h1>

      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Semaine précédente"
          onClick={() => setWeekId(shiftWeek(weekId, -1))}
          className="ht-btn h-8 w-8 p-0"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-extrabold text-[var(--ht-text)]">
            Semaine du {formatWeekRange(weekId)}
          </p>
          {weekId !== weekIdOf(new Date()) && (
            <button
              type="button"
              onClick={() => setWeekId(weekIdOf(new Date()))}
              className="ht-link text-xs"
            >
              Revenir à cette semaine
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Semaine suivante"
          onClick={() => setWeekId(shiftWeek(weekId, 1))}
          className="ht-btn h-8 w-8 p-0"
        >
          ›
        </button>
      </div>

      <div className="mb-3">
        <div role="tablist" className="ht-nav-pill w-full">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`ht-nav-link ${tab === key ? "ht-nav-link-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {shareable && hasContent && (
        <div className="mb-4 flex flex-col gap-2">
          <a
            href={whatsappUrl(shareMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="ht-btn flex w-full items-center justify-center px-3 py-2 text-sm font-semibold"
          >
            {tab === "plan"
              ? "Envoyer le programme sur WhatsApp"
              : "Envoyer toute la liste sur WhatsApp"}
          </a>
          {tab === "plan" && (
          <button
            type="button"
            disabled={sharingTable}
            onClick={() => void shareAsTable()}
            className="ht-btn flex w-full items-center justify-center px-3 py-2 text-sm font-semibold"
          >
            {sharingTable
              ? "Création de l'image…"
              : "Envoyer le programme en tableau (image)"}
          </button>
          )}
          {shareError && (
            <p role="alert" className="text-sm text-[var(--ht-danger)]">
              {shareError}
            </p>
          )}
        </div>
      )}

      {loading && <p className="text-[var(--ht-text-2)]">Chargement...</p>}
      {!loading && tab === "plan" && (
        <div className="flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div role="group" aria-label="Affichage du programme" className="flex gap-1.5">
              {(
                [
                  ["detail", "Détail"],
                  ["calendar", "Calendrier"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={planView === key}
                  onClick={() => setPlanView(key)}
                  className={`ht-btn px-3 py-1.5 text-sm ${planView === key ? "font-extrabold" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {counts.all > 0 && (
            <div
              role="group"
              aria-label="Filtrer le programme par statut"
              className="mb-3 flex flex-wrap gap-1.5"
            >
              {STATUS_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={statusFilter === key}
                  onClick={() => setStatusFilter(key)}
                  className={`ht-btn px-2.5 py-1 text-xs ${statusFilter === key ? "font-extrabold" : ""}`}
                >
                  {label} ({counts[key]})
                </button>
              ))}
            </div>
          )}
          {counts.prepared + counts.skipped > 0 && (
            <WeeklyFeedback plan={plan} translations={translations} />
          )}
          <ProgramImport weekId={weekId} />
          {planView === "calendar" ? (
            <MealCalendar
              plan={filterPlan(plan, statusFilter)}
              onSelectDay={openDay}
              translations={translations}
            />
          ) : (
            <MealWeekPlan
              plan={plan}
              dishes={dishes}
              translations={translations}
              filter={statusFilter}
            />
          )}
        </div>
      )}
      {!loading && tab === "shopping" && (
        <div className="mb-3">
          <CoveragePanel
            plan={plan}
            dishes={dishes}
            list={list}
            translations={translations}
            pantry={pantry}
            ingredients={ingredients}
          />
        </div>
      )}
      {!loading && tab === "shopping" && (
        <ShoppingListView
          list={list}
          expenses={expenses}
          userId={userId}
          ingredients={ingredients}
          translations={translations}
        />
      )}
      {tab === "library" && (
        <DishLibrary
          dishes={dishes}
          ingredients={ingredients}
          translations={translations}
        />
      )}
      {!loading && tab === "expenses" && (
        <ExpensesView weekId={weekId} userId={userId} expenses={expenses} />
      )}
    </div>
  );
}
