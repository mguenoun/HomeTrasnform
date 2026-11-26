import { useMemo, useState } from "react";
import { catalogKey } from "../domain/catalog";
import {
  COURSE_LABEL,
  MEAL_TYPE_LABEL,
  dishCourse,
  describeVariants,
  dishMealType,
  inferMealTypes,
  inferredLabelsToSave,
  isSnackDish,
} from "../domain/dishes";
import { computeDishStats, sortDishes, type DishSort } from "../domain/feedback";
import { useAllMealPlans } from "../hooks/useMeals";
import type { TranslationIndex } from "../domain/translations";
import type { CatalogIngredient, Dish } from "../types";
import { WEEK_DAYS } from "../domain/mealPlan";
import { saveMealTypes } from "../services/meals";
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
  // Repas habituel déduit de ce qui a déjà été planifié, pour les plats sans étiquette.
  const inferred = useMemo(() => inferMealTypes(allPlans), [allPlans]);
  const toSave = inferredLabelsToSave(dishes, inferred);
  const untagged = dishes.filter(
    (d) => !isSnackDish(d) && !dishMealType(d, inferred).type,
  ).length;
  const [tagMessage, setTagMessage] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);

  async function saveInferred() {
    setTagError(null);
    setTagMessage(null);
    try {
      await saveMealTypes(toSave);
      setTagMessage(`${toSave.length} étiquette${toSave.length > 1 ? "s" : ""} enregistrée${toSave.length > 1 ? "s" : ""}.`);
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    }
  }

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
        inferredType={editedDish ? inferred.get(catalogKey(editedDish.name)) : undefined}
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

      {toSave.length > 0 && (
        <div className="ht-card flex flex-col gap-2 p-3 text-sm text-[var(--ht-text)]">
          <p>
            {toSave.length} plat{toSave.length > 1 ? "s" : ""} sans étiquette « déjeuner / dîner »
            ont pu être classés d&apos;après les programmes déjà saisis (affichés « déduit »).
          </p>
          <button
            type="button"
            onClick={() => void saveInferred()}
            className="ht-btn-cta-sm self-start"
          >
            Enregistrer les {toSave.length} étiquettes déduites
          </button>
        </div>
      )}
      {tagMessage && (
        <p role="status" className="text-sm text-[var(--ht-text)]">
          {tagMessage}
        </p>
      )}
      {tagError && (
        <p role="alert" className="text-sm text-[var(--ht-danger)]">
          {tagError}
        </p>
      )}
      {untagged > 0 && (
        <p className="text-xs text-[var(--ht-text-2)]">
          {untagged} plat{untagged > 1 ? "s" : ""} sans étiquette, jamais servi{untagged > 1 ? "s" : ""} :
          à compléter en ouvrant le plat.
        </p>
      )}

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
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-left"
                >
                  <span dir="auto" className="min-w-0 basis-full break-words text-sm text-[var(--ht-text)]">
                    {dish.name}
                    {dish.translation && (
                      <span className="text-[var(--ht-text-2)]">
                        {" "}
                        — {dish.translation}
                      </span>
                    )}
                  </span>
                  <span className="ht-pill ht-pill-neutral">
                    {isSnackDish(dish) ? "Snack" : COURSE_LABEL[dishCourse(dish)]}
                  </span>
                  {dish.preferredDay && !isSnackDish(dish) && (
                    <span className="ht-pill ht-pill-neutral">
                      {WEEK_DAYS.find((d) => d.key === dish.preferredDay)?.fr ?? dish.preferredDay}
                    </span>
                  )}
                  {(() => {
                    if (isSnackDish(dish)) return null;
                    const { type, inferred: guessed } = dishMealType(dish, inferred);
                    return type ? (
                      <span className="ht-pill ht-pill-info" style={{ whiteSpace: "normal" }}>
                        {MEAL_TYPE_LABEL[type]}
                        {guessed && " (déduit)"}
                      </span>
                    ) : null;
                  })()}
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
