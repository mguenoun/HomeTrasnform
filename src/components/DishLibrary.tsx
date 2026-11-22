import { useMemo, useState } from "react";
import { catalogKey } from "../domain/catalog";
import { describeVariants } from "../domain/dishes";
import { computeDishStats, sortDishes, type DishSort } from "../domain/feedback";
import { useAllMealPlans } from "../hooks/useMeals";
import type { TranslationIndex } from "../domain/translations";
import type { CatalogIngredient, Dish } from "../types";
import { DishEditor } from "./DishEditor";

type Editing = { kind: "new" } | { kind: "edit"; id: string } | null;

/**
 * Bibliothèque de plats et de snacks. Les plats s'y créent à la main ou se
 * remplissent seuls à mesure qu'on planifie (sans ingrédients tant qu'on ne les
 * détaille pas). La liste de courses reste utilisable sans rien détailler ici.
 */
export function DishLibrary({
  dishes,
  ingredients,
  translations,
}: {
  dishes: Dish[];
  ingredients: CatalogIngredient[];
  translations?: TranslationIndex;
}) {
  const [editing, setEditing] = useState<Editing>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<DishSort>("name");
  // Statistiques sur toutes les semaines : servi N fois, 👍/👎. Calculées à la
  // lecture (rien à maintenir) à partir des plats marqués « préparés ».
  const allPlans = useAllMealPlans();
  const stats = useMemo(() => computeDishStats(allPlans), [allPlans]);

  const needle = catalogKey(search);
  const visible = sortDishes(dishes, stats, sort).filter(
    (d) =>
      !needle ||
      catalogKey(d.name).includes(needle) ||
      catalogKey(d.translation ?? "").includes(needle),
  );
  const detailed = dishes.filter((d) => (d.variants ?? []).length > 0).length;
  const editedDish =
    editing?.kind === "edit" ? dishes.find((d) => d.id === editing.id) : undefined;

  if (editing && (editing.kind === "new" || editedDish)) {
    return (
      <DishEditor
        // Remonte l'éditeur quand on change de plat : état de formulaire neuf.
        key={editing.kind === "edit" ? editing.id : "new"}
        dish={editedDish}
        dishes={dishes}
        ingredients={ingredients}
        translations={translations}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--ht-text-2)]">
          {dishes.length} plat{dishes.length > 1 ? "s" : ""} · {detailed} avec
          ingrédients
        </p>
        <button
          type="button"
          onClick={() => setEditing({ kind: "new" })}
          className="ht-btn-cta-sm"
        >
          Nouveau plat
        </button>
      </div>

      {dishes.length > 0 && (
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un plat…"
            aria-label="Rechercher un plat"
            dir="auto"
            className="ht-input min-w-0 flex-1"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as DishSort)}
            aria-label="Trier les plats"
            className="ht-input w-auto"
          >
            <option value="name">Nom</option>
            <option value="approval">Mieux notés</option>
            <option value="served">Plus servis</option>
          </select>
        </div>
      )}

      {dishes.length === 0 ? (
        <p className="text-[var(--ht-text-2)]">
          Aucun plat pour l&apos;instant. Ils s&apos;ajoutent seuls quand vous
          remplissez le programme, ou créez-en un avec « Nouveau plat ».
        </p>
      ) : visible.length === 0 ? (
        <p className="text-[var(--ht-text-2)]">Aucun plat ne correspond.</p>
      ) : (
        <ul className="ht-card divide-y divide-[var(--ht-input-border)]">
          {visible.map((dish) => {
            const detailedDish = (dish.variants ?? []).length > 0;
            return (
              <li key={dish.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ kind: "edit", id: dish.id })}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                >
                  <span dir="auto" className="min-w-0 flex-1 break-words text-sm text-[var(--ht-text)]">
                    {dish.name}
                    {dish.translation && (
                      <span className="text-[var(--ht-text-2)]">
                        {" "}
                        — {dish.translation}
                      </span>
                    )}
                  </span>
                  <span className="ht-pill ht-pill-neutral">
                    {dish.basis === "units" || (!dish.basis && dish.asSnack && !dish.asMeal)
                      ? "Snack"
                      : "Plat"}
                  </span>
                  <span
                    className={`text-xs ${
                      detailedDish
                        ? "text-[var(--ht-text-2)]"
                        : "text-[var(--ht-danger)]"
                    }`}
                  >
                    {describeVariants(dish)}
                  </span>
                  {(() => {
                    const s = stats.get(catalogKey(dish.name));
                    return s ? (
                      <span className="text-xs text-[var(--ht-text-2)]">
                        servi {s.served}×
                        {s.up + s.down > 0 && ` · 👍 ${s.up} · 👎 ${s.down}`}
                      </span>
                    ) : null;
                  })()}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
