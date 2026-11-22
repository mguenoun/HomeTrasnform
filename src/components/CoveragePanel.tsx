import { useState } from "react";
import { catalogKey } from "../domain/catalog";
import {
  checkCoverage,
  collectMissing,
  type DishCheck,
} from "../domain/coverage";
import type { TranslationIndex } from "../domain/translations";
import {
  addShoppingItem,
  addShoppingItems,
  setInPantry,
} from "../services/meals";
import type {
  CatalogIngredient,
  Dish,
  DishIngredient,
  MealPlan,
  PantryItem,
  ShoppingList,
} from "../types";

function describePlace(check: DishCheck): string {
  const size =
    check.dish?.basis === "units"
      ? check.n
        ? ` ×${check.n}`
        : ""
      : check.n
        ? ` (${check.n} p.)`
        : "";
  return `${check.dayFr} · ${check.mealFr} — ${check.item.label}${size}`;
}

/**
 * Contrôle des oublis : les plats encore planifiés ont-ils tous leurs
 * ingrédients dans la liste de courses ? Une cause réelle de plat non préparé
 * (« pas de cha3ria dans la liste »). Propose d'ajouter ce qui manque, ou de
 * marquer un ingrédient « en stock » pour ne plus le signaler (sel, huile…).
 */
export function CoveragePanel({
  plan,
  dishes,
  list,
  translations,
  pantry,
  ingredients,
}: {
  plan: MealPlan;
  dishes: Dish[];
  list: ShoppingList;
  translations?: TranslationIndex;
  pantry: PantryItem[];
  ingredients: CatalogIngredient[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const checks = checkCoverage({
    plan,
    dishes,
    listItems: Object.values(list.items),
    translations,
    pantryKeys: new Set(pantry.map((p) => p.id)),
  });
  // Rien de planifié : rien à contrôler.
  if (checks.length === 0 && pantry.length === 0) return null;

  const missingChecks = checks.filter((c) => c.status === "missing");
  const noRecipe = checks.filter((c) => c.status === "no-recipe");
  const complete = checks.filter((c) => c.status === "ok").length;
  const needed = collectMissing(missingChecks);

  /** Dernier point de vente connu pour cet article, pour le proposer d'office. */
  function usualVendor(name: string): string | undefined {
    const key = catalogKey(name);
    return ingredients.find((i) => catalogKey(i.name) === key)?.vendor;
  }

  function toItem(ingredient: DishIngredient) {
    return {
      name: ingredient.name,
      quantity: ingredient.quantity,
      vendor: usualVendor(ingredient.name),
    };
  }

  async function run(action: () => Promise<unknown>, success?: string) {
    setError(null);
    setMessage(null);
    try {
      await action();
      if (success) setMessage(success);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'enregistrement.",
      );
    }
  }

  return (
    <section className="ht-card flex flex-col gap-3 p-4" aria-label="Contrôle des oublis">
      <h3 className="text-sm font-extrabold text-[var(--ht-text)]">
        Contrôle des oublis
      </h3>

      {checks.length > 0 && missingChecks.length === 0 && noRecipe.length === 0 && (
        <p className="text-sm text-[var(--ht-text)]">
          ✓ Rien d&apos;oublié : les ingrédients des {complete} plats planifiés
          sont tous dans la liste.
        </p>
      )}

      {missingChecks.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-[var(--ht-danger)]">
            {missingChecks.length} plat{missingChecks.length > 1 ? "s" : ""} avec
            des ingrédients absents de la liste :
          </p>
          {missingChecks.map((check) => (
            <div
              key={`${check.slot}-${check.item.label}`}
              className="rounded-lg border border-[var(--ht-input-border)] p-3"
            >
              <p dir="auto" className="text-sm font-semibold text-[var(--ht-text)]">
                {describePlace(check)}
                {check.approx && (
                  <span className="ml-2 text-xs font-normal text-[var(--ht-text-2)]">
                    taille estimée, à vérifier
                  </span>
                )}
              </p>
              <ul className="mt-1 flex flex-col gap-1">
                {check.missing.map((ingredient) => (
                  <li
                    key={ingredient.name}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span dir="auto" className="min-w-0 flex-1 break-words">
                      {ingredient.name}
                      {ingredient.quantity && (
                        <span className="text-[var(--ht-text-2)]">
                          {" "}
                          — {ingredient.quantity}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      aria-label={`Ajouter ${ingredient.name} à la liste`}
                      onClick={() =>
                        void run(() =>
                          addShoppingItem(list.weekId, toItem(ingredient)),
                        )
                      }
                      className="ht-btn px-2 py-0.5 text-xs"
                    >
                      Ajouter
                    </button>
                    <button
                      type="button"
                      aria-label={`${ingredient.name} est en stock`}
                      onClick={() =>
                        void run(() => setInPantry(ingredient.name, true))
                      }
                      className="ht-btn px-2 py-0.5 text-xs"
                    >
                      En stock
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              void run(
                () =>
                  addShoppingItems(list.weekId, needed.map(toItem)),
                `${needed.length} ingrédient${needed.length > 1 ? "s ajoutés" : " ajouté"} à la liste.`,
              )
            }
            className="ht-btn-cta-sm self-start"
          >
            Ajouter tout ce qui manque ({needed.length})
          </button>
        </div>
      )}

      {noRecipe.length > 0 && (
        <p className="text-sm text-[var(--ht-text-2)]">
          Ingrédients non définis, donc non contrôlés (à compléter dans la
          Bibliothèque) :{" "}
          <span dir="auto">
            {[...new Set(noRecipe.map((c) => c.item.label))].join(", ")}
          </span>
        </p>
      )}

      {pantry.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ht-text-2)]">
          <span>En stock, jamais signalés :</span>
          {pantry.map((p) => (
            <span
              key={p.id}
              className="ht-pill ht-pill-neutral"
              style={{ whiteSpace: "normal", borderRadius: 12 }}
            >
              <span dir="auto">{p.name}</span>
              <button
                type="button"
                aria-label={`Retirer ${p.name} du stock`}
                onClick={() => void run(() => setInPantry(p.name, false))}
                className="leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {message && (
        <p role="status" className="text-sm text-[var(--ht-text)]">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-[var(--ht-danger)]">
          {error}
        </p>
      )}
    </section>
  );
}
