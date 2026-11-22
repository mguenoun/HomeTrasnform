import { useState } from "react";
import { catalogKey } from "../domain/catalog";
import { missingPersonSizes } from "../domain/dishes";
import { deleteDish, saveDish } from "../services/meals";
import { TranslationInput } from "./TranslationInput";
import type { CatalogIngredient, Dish } from "../types";

interface IngredientDraft {
  name: string;
  quantity: string;
}

interface VariantDraft {
  /** Texte saisi ; validé à l'enregistrement. */
  n: string;
  ingredients: IngredientDraft[];
}

function toDrafts(dish: Dish | undefined): VariantDraft[] {
  return (dish?.variants ?? []).map((v) => ({
    n: String(v.n),
    ingredients: v.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity ?? "",
    })),
  }));
}

/**
 * Édition d'un plat : nom (+ traduction), type (plat par personnes / snack par
 * quantité) et, pour chaque taille, la liste d'ingrédients propre à cette taille
 * (les quantités ne sont pas proportionnelles au nombre de convives).
 */
export function DishEditor({
  dish,
  dishes,
  ingredients,
  onClose,
}: {
  dish?: Dish;
  dishes: Dish[];
  ingredients: CatalogIngredient[];
  onClose: () => void;
}) {
  const [name, setName] = useState(dish?.name ?? "");
  const [translation, setTranslation] = useState(dish?.translation ?? "");
  const [basis, setBasis] = useState<"persons" | "units">(
    dish?.basis ?? (dish?.asSnack && !dish?.asMeal ? "units" : "persons"),
  );
  const [unitLabel, setUnitLabel] = useState(dish?.unitLabel ?? "");
  const [variants, setVariants] = useState<VariantDraft[]>(() => toDrafts(dish));
  const [newSize, setNewSize] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isNew = !dish;
  const sizeLabel = (n: string) =>
    basis === "persons" ? `${n || "?"} pers.` : `${n || "?"} ${unitLabel.trim() || "unités"}`;

  function addVariant(n: number) {
    if (!Number.isInteger(n) || n < 1) {
      setError("La taille doit être un nombre entier positif.");
      return;
    }
    if (variants.some((v) => Number(v.n) === n)) {
      setError(`La taille ${n} existe déjà.`);
      return;
    }
    setError(null);
    setNewSize("");
    setVariants((current) => [
      ...current,
      { n: String(n), ingredients: [{ name: "", quantity: "" }] },
    ]);
  }

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setVariants((current) =>
      current.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }

  function updateIngredient(
    vIndex: number,
    iIndex: number,
    patch: Partial<IngredientDraft>,
  ) {
    setVariants((current) =>
      current.map((v, i) =>
        i === vIndex
          ? {
              ...v,
              ingredients: v.ingredients.map((ing, j) =>
                j === iIndex ? { ...ing, ...patch } : ing,
              ),
            }
          : v,
      ),
    );
  }

  function copyFrom(targetIndex: number, sourceIndex: number) {
    if (Number.isNaN(sourceIndex) || sourceIndex === targetIndex) return;
    updateVariant(targetIndex, {
      ingredients: variants[sourceIndex].ingredients.map((ing) => ({ ...ing })),
    });
  }

  async function handleSave() {
    const key = catalogKey(name);
    if (!key) {
      setError("Le nom du plat est obligatoire.");
      return;
    }
    if (dishes.some((d) => d.id === key && d.id !== dish?.id)) {
      setError("Un plat de ce nom existe déjà.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await saveDish(dish?.id ?? null, {
        name,
        translation,
        basis,
        unitLabel,
        variants: variants.map((v) => ({
          n: Number(v.n),
          ingredients: v.ingredients,
        })),
        asSnack: dish?.asSnack,
        asMeal: dish?.asMeal,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'enregistrement.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!dish) return;
    setBusy(true);
    try {
      await deleteDish(dish.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la suppression.");
      setBusy(false);
    }
  }

  return (
    <section className="ht-card flex flex-col gap-3 p-4">
      <h3 className="text-sm font-extrabold text-[var(--ht-text)]">
        {isNew ? "Nouveau plat" : `Modifier « ${dish.name} »`}
      </h3>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom (ex. شعرية الحليب)"
          aria-label="Nom du plat"
          dir="auto"
          className="ht-input flex-1"
        />
        <div className="flex-1">
          <TranslationInput
            value={translation}
            onChange={setTranslation}
            source={name}
          />
        </div>
      </div>

      <div role="radiogroup" aria-label="Type de plat" className="flex flex-wrap gap-4">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="dish-basis"
            checked={basis === "persons"}
            onChange={() => setBasis("persons")}
          />
          Plat (quantités par nombre de personnes)
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="dish-basis"
            checked={basis === "units"}
            onChange={() => setBasis("units")}
          />
          Snack (quantités par nombre d&apos;unités)
        </label>
      </div>

      {basis === "units" && (
        <input
          value={unitLabel}
          onChange={(e) => setUnitLabel(e.target.value)}
          placeholder="Unité (ex. petite pizza, part)"
          aria-label="Unité du snack"
          dir="auto"
          className="ht-input sm:w-64"
        />
      )}

      <datalist id="library-ingredients">
        {ingredients.map((i) => (
          <option key={i.id} value={i.name} />
        ))}
      </datalist>

      {variants.length === 0 && (
        <p className="text-sm text-[var(--ht-text-2)]">
          Aucune taille définie : ajoutez les ingrédients pour une taille (ex. 4
          personnes), puis copiez-les vers les autres. Une taille sans ingrédient
          n&apos;est pas enregistrée.
        </p>
      )}

      {variants.map((variant, vIndex) => (
        <fieldset
          key={vIndex}
          className="flex flex-col gap-2 rounded-lg border border-[var(--ht-input-border)] p-3"
        >
          <legend className="px-1 text-xs font-extrabold text-[var(--ht-text)]">
            Pour {sizeLabel(variant.n)}
          </legend>

          {variant.ingredients.map((ing, iIndex) => (
            <div key={iIndex} className="flex gap-2">
              <input
                value={ing.name}
                onChange={(e) =>
                  updateIngredient(vIndex, iIndex, { name: e.target.value })
                }
                placeholder="Ingrédient"
                aria-label={`Ingrédient ${iIndex + 1}, ${sizeLabel(variant.n)}`}
                list="library-ingredients"
                dir="auto"
                className="ht-input flex-1"
              />
              <input
                value={ing.quantity}
                onChange={(e) =>
                  updateIngredient(vIndex, iIndex, { quantity: e.target.value })
                }
                placeholder="Quantité"
                aria-label={`Quantité ${iIndex + 1}, ${sizeLabel(variant.n)}`}
                dir="auto"
                className="ht-input w-32"
              />
              <button
                type="button"
                aria-label={`Retirer l'ingrédient ${iIndex + 1}, ${sizeLabel(variant.n)}`}
                onClick={() =>
                  updateVariant(vIndex, {
                    ingredients: variant.ingredients.filter((_, j) => j !== iIndex),
                  })
                }
                className="text-[var(--ht-text-2)]"
              >
                ×
              </button>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                updateVariant(vIndex, {
                  ingredients: [...variant.ingredients, { name: "", quantity: "" }],
                })
              }
              className="ht-btn px-2.5 py-1 text-xs"
            >
              + Ingrédient
            </button>
            {variants.length > 1 && (
              <select
                aria-label={`Copier les ingrédients vers ${sizeLabel(variant.n)}`}
                value=""
                onChange={(e) => copyFrom(vIndex, Number(e.target.value))}
                className="ht-input w-auto py-1 text-xs"
              >
                <option value="">Copier depuis…</option>
                {variants.map(
                  (other, oIndex) =>
                    oIndex !== vIndex && (
                      <option key={oIndex} value={oIndex}>
                        {sizeLabel(other.n)}
                      </option>
                    ),
                )}
              </select>
            )}
            <button
              type="button"
              aria-label={`Supprimer la taille ${sizeLabel(variant.n)}`}
              onClick={() =>
                setVariants((current) => current.filter((_, i) => i !== vIndex))
              }
              className="ml-auto text-xs text-[var(--ht-danger)]"
            >
              Supprimer cette taille
            </button>
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        {basis === "persons" &&
          missingPersonSizes(variants.map((v) => ({ n: Number(v.n) }))).map(
            (size) => (
              <button
                key={size}
                type="button"
                onClick={() => addVariant(size)}
                className="ht-btn px-2.5 py-1 text-xs"
              >
                + {size} pers.
              </button>
            ),
          )}
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={newSize}
          onChange={(e) => setNewSize(e.target.value)}
          placeholder={basis === "persons" ? "Autre taille" : "Quantité (ex. 10)"}
          aria-label="Nouvelle taille"
          className="ht-input w-32 py-1"
        />
        <button
          type="button"
          disabled={!newSize}
          onClick={() => addVariant(Number(newSize))}
          className="ht-btn px-2.5 py-1 text-xs"
        >
          Ajouter cette taille
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--ht-danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy}
          className="ht-btn-cta-sm"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="ht-btn px-3 py-1.5 text-sm"
        >
          Annuler
        </button>
        {!isNew &&
          (confirmDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={busy}
              className="ht-btn-danger ml-auto px-3 py-1.5 text-sm"
            >
              Confirmer la suppression
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="ml-auto text-sm text-[var(--ht-danger)]"
            >
              Supprimer le plat
            </button>
          ))}
      </div>
    </section>
  );
}
