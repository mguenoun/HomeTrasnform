import { useState } from "react";
import { Breadcrumb } from "../components/Breadcrumb";
import { MealWeekPlan } from "../components/MealWeekPlan";
import { ShoppingListView } from "../components/ShoppingListView";
import {
  buildPlanMessage,
  buildShoppingMessage,
  formatWeekRange,
  shiftWeek,
  weekIdOf,
  whatsappUrl,
} from "../domain/mealPlan";
import { useMealPlan, useShoppingList } from "../hooks/useMeals";

type Tab = "plan" | "shopping";

export function MealsPage() {
  const [weekId, setWeekId] = useState(() => weekIdOf(new Date()));
  const [tab, setTab] = useState<Tab>("plan");
  const { plan, loading: planLoading } = useMealPlan(weekId);
  const { list, loading: listLoading } = useShoppingList(weekId);

  const shareMessage =
    tab === "plan"
      ? buildPlanMessage(plan)
      : buildShoppingMessage(Object.values(list.items));
  const hasContent =
    tab === "plan"
      ? Object.values(plan.slots).some((slot) => slot.items.length > 0)
      : Object.keys(list.items).length > 0;
  const loading = tab === "plan" ? planLoading : listLoading;

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

      <div className="mb-4 flex items-center justify-between gap-2">
        <div role="tablist" className="ht-nav-pill">
          {(
            [
              ["plan", "Programme"],
              ["shopping", "Courses"],
            ] as const
          ).map(([key, label]) => (
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
        {hasContent && (
          <a
            href={whatsappUrl(shareMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="ht-btn px-3 py-1.5 text-sm"
          >
            Envoyer sur WhatsApp
          </a>
        )}
      </div>

      {loading && <p className="text-[var(--ht-text-2)]">Chargement...</p>}
      {!loading && tab === "plan" && <MealWeekPlan plan={plan} />}
      {!loading && tab === "shopping" && <ShoppingListView list={list} />}
    </div>
  );
}
