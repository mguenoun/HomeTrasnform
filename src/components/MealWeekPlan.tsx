import { useState, type FormEvent } from "react";
import {
  MEALS,
  daysOfWeek,
  dinersOf,
  itemTranslation,
  slotKey,
  snacksForDay,
  splitMealText,
  type WeekDay,
} from "../domain/mealPlan";
import { translationFor, type TranslationIndex } from "../domain/translations";
import { saveMealSlot, setDishTranslation } from "../services/meals";
import type { Dish, MealPlan, MealSlot } from "../types";
import { TranslationInput } from "./TranslationInput";

const EMPTY_SLOT: MealSlot = { items: [] };

function SlotEditor({
  plan,
  day,
  mealKey,
  mealLabel,
  translations,
}: {
  plan: MealPlan;
  day: WeekDay;
  mealKey: string;
  mealLabel: string;
  translations?: TranslationIndex;
}) {
  const key = slotKey(day.key, mealKey);
  const slot = plan.slots[key] ?? EMPTY_SLOT;
  const isSnack = mealKey === "snack";
  const diners = dinersOf(plan, slot);
  // Snacks d'un jour vide : ceux du dernier jour non vide (reportés, non copiés).
  const inheritedFrom = isSnack ? snacksForDay(plan, day.key).inheritedFrom : undefined;
  const inheritedItems = inheritedFrom
    ? (plan.slots[slotKey(inheritedFrom.key, "snack")]?.items ?? [])
    : [];
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Plat en cours de correction/traduction (index dans le créneau).
  const [editing, setEditing] = useState<{
    index: number;
    label: string;
    translation: string;
  } | null>(null);

  async function save(next: MealSlot) {
    setError(null);
    try {
      await saveMealSlot(plan.weekId, key, next);
    } catch {
      setError("Échec de l'enregistrement. Réessayez.");
    }
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    // "couscous + salade" -> deux éléments (la plupart des repas sont composés).
    const labels = splitMealText(draft);
    if (labels.length === 0) return;
    setDraft("");
    void save({
      ...slot,
      items: [...slot.items, ...labels.map((label) => ({ label }))],
    });
  }

  function handleEditSave(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const label = editing.label.trim();
    if (!label) {
      setError("Le nom ne peut pas être vide.");
      return;
    }
    const translation = editing.translation;
    // Le libellé corrigé va sur l'élément ; la traduction, elle, est enregistrée
    // dans le référentiel : elle vaut alors pour toutes les occurrences de ce nom
    // (jours répétés, autres semaines, bibliothèque) sans être retapée.
    void save({
      ...slot,
      items: slot.items.map((item, i) =>
        i === editing.index ? { label } : item,
      ),
    });
    setDishTranslation(label, translation).catch(() =>
      setError("Échec de l'enregistrement de la traduction. Réessayez."),
    );
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-[var(--ht-input-border)] py-2.5 first:border-t-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--ht-text)]">
          {mealLabel}
        </span>
        {/* Un snack se prépare par quantité, pas par nombre de convives. */}
        {!isSnack && (
          <span className="flex items-center gap-1 text-xs text-[var(--ht-text-2)]">
            <button
              type="button"
              aria-label={`Moins de convives, ${mealLabel}`}
              disabled={diners <= 1}
              onClick={() => void save({ ...slot, diners: diners - 1 })}
              className="ht-btn h-6 w-6 p-0"
            >
              −
            </button>
            <span
              aria-label={`Convives, ${mealLabel}`}
              className="min-w-[2.5ch] text-center"
            >
              {diners} p.
            </span>
            <button
              type="button"
              aria-label={`Plus de convives, ${mealLabel}`}
              onClick={() => void save({ ...slot, diners: diners + 1 })}
              className="ht-btn h-6 w-6 p-0"
            >
              +
            </button>
          </span>
        )}
      </div>

      {slot.items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {slot.items.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              className="ht-pill ht-pill-neutral flex max-w-full items-center gap-1"
              style={{ whiteSpace: "normal", borderRadius: 12 }}
            >
              <button
                type="button"
                aria-label={`Modifier ${item.label}`}
                onClick={() =>
                  setEditing({
                    index,
                    label: item.label,
                    translation: itemTranslation(item, translations) ?? "",
                  })
                }
                dir="auto"
                className="min-w-0 break-words text-left"
              >
                {/* Le nom sur une ligne, sa traduction (si elle existe) dessous. */}
                <span className="block">{item.label}</span>
                {itemTranslation(item, translations) && (
                  <span className="block font-normal text-[var(--ht-text-2)]">
                    {itemTranslation(item, translations)}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={`Retirer ${item.label}`}
                onClick={() =>
                  void save({
                    ...slot,
                    items: slot.items.filter((_, i) => i !== index),
                  })
                }
                className="leading-none text-[var(--ht-text-2)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <form
          onSubmit={handleEditSave}
          className="flex flex-col gap-2 rounded-lg border border-[var(--ht-input-border)] p-2.5"
        >
          <input
            value={editing.label}
            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            aria-label={`Nom, ${mealLabel}`}
            dir="auto"
            className="ht-input"
          />
          <TranslationInput
            value={editing.translation}
            onChange={(translation) => setEditing({ ...editing, translation })}
            source={editing.label}
            known={translationFor(translations, editing.label)}
          />
          <div className="flex gap-2">
            <button type="submit" className="ht-btn-cta-sm">
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="ht-btn px-3 py-1.5 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {inheritedFrom && (
        <p
          dir="auto"
          className="text-xs italic text-[var(--ht-text-2)]"
          data-testid="inherited-snacks"
        >
          Suite de {inheritedFrom.fr.toLowerCase()} :{" "}
          {inheritedItems.map((item) => item.label).join(", ")}
        </p>
      )}

      <form onSubmit={handleAdd} className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ajouter (ex. couscous + salade)…"
          aria-label={`Ajouter un plat, ${mealLabel}`}
          list={isSnack ? "dishes-snack" : "dishes-meal"}
          dir="auto"
          className="ht-input flex-1"
        />
      </form>
      {error && (
        <p role="alert" className="text-xs text-[var(--ht-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

export function MealWeekPlan({
  plan,
  dishes = [],
  translations,
}: {
  plan: MealPlan;
  dishes?: Dish[];
  translations?: TranslationIndex;
}) {
  return (
    <div className="flex flex-col gap-3">
      <datalist id="dishes-snack">
        {dishes
          .filter((d) => d.asSnack)
          .map((d) => (
            <option key={d.id} value={d.name} />
          ))}
      </datalist>
      <datalist id="dishes-meal">
        {dishes
          .filter((d) => d.asMeal)
          .map((d) => (
            <option key={d.id} value={d.name} />
          ))}
      </datalist>
      {daysOfWeek(plan.weekId).map((day) => (
        <section key={day.key} id={`day-${day.key}`} className="ht-card p-4">
          <h3 className="mb-1 text-sm font-extrabold text-[var(--ht-text)]">
            {day.fr} {day.date.getDate()}
          </h3>
          {MEALS.map((meal) => (
            <SlotEditor
              key={meal.key}
              plan={plan}
              day={day}
              mealKey={meal.key}
              mealLabel={meal.fr}
              translations={translations}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
