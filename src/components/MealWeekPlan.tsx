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
import {
  SKIP_REASONS,
  filterPlan,
  itemStatus,
  markPlannedAsPrepared,
  matchesFilter,
  withStatus,
  type StatusFilter,
} from "../domain/mealStatus";
import { translationFor, type TranslationIndex } from "../domain/translations";
import { saveMealSlot, setDishTranslation } from "../services/meals";
import type { Dish, MealItem, MealPlan, MealSlot } from "../types";
import { TranslationInput } from "./TranslationInput";

const EMPTY_SLOT: MealSlot = { items: [] };
const WRAP_STYLE = { whiteSpace: "normal", borderRadius: 12 } as const;

const STATUS_PILL: Record<string, string> = {
  planned: "ht-pill-neutral",
  prepared: "ht-pill-ok",
  skipped: "ht-pill-warn",
};

function SlotEditor({
  plan,
  filteredPlan,
  filter,
  day,
  mealKey,
  mealLabel,
  translations,
}: {
  plan: MealPlan;
  /** Programme réduit au filtre actif (identique à `plan` si « Tout »). */
  filteredPlan: MealPlan;
  filter: StatusFilter;
  day: WeekDay;
  mealKey: string;
  mealLabel: string;
  translations?: TranslationIndex;
}) {
  const key = slotKey(day.key, mealKey);
  const slot = plan.slots[key] ?? EMPTY_SLOT;
  const isSnack = mealKey === "snack";
  const filtered = filter !== "all";
  const diners = dinersOf(plan, slot);
  // Snacks d'un jour vide : ceux du dernier jour non vide (reportés, non copiés),
  // recalculés sur le programme filtré.
  const inheritedFrom = isSnack
    ? snacksForDay(filteredPlan, day.key).inheritedFrom
    : undefined;
  const inheritedItems = inheritedFrom
    ? (filteredPlan.slots[slotKey(inheritedFrom.key, "snack")]?.items ?? [])
    : [];
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Plat en cours de correction/traduction (index dans le créneau).
  const [editing, setEditing] = useState<{
    index: number;
    label: string;
    translation: string;
  } | null>(null);
  // Plat pour lequel on choisit le motif de non-préparation.
  const [skipPicker, setSkipPicker] = useState<number | null>(null);

  // On garde l'index d'origine : modifier ou retirer un plat sous un filtre ne
  // doit jamais viser un autre plat que celui qu'on voit.
  const visible = slot.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => matchesFilter(item, filter));

  if (filtered && visible.length === 0 && !inheritedFrom) return null;

  async function save(next: MealSlot) {
    setError(null);
    try {
      await saveMealSlot(plan.weekId, key, next);
    } catch {
      setError("Échec de l'enregistrement. Réessayez.");
    }
  }

  function setStatus(index: number, status: "planned" | "prepared" | "skipped", reason?: string) {
    setSkipPicker(null);
    void save({
      ...slot,
      items: slot.items.map((item, i) =>
        i === index ? withStatus(item, status, reason) : item,
      ),
    });
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
    // Le libellé corrigé va sur l'élément (statut et motif conservés) ; la
    // traduction, elle, est enregistrée dans le référentiel : elle vaut alors
    // pour toutes les occurrences de ce nom sans être retapée.
    void save({
      ...slot,
      items: slot.items.map((item, i) => {
        if (i !== editing.index) return item;
        const next: MealItem = { ...item, label };
        delete next.translation;
        return next;
      }),
    });
    setDishTranslation(label, translation).catch(() =>
      setError("Échec de l'enregistrement de la traduction. Réessayez."),
    );
    setEditing(null);
  }

  const hasPlanned = slot.items.some((item) => itemStatus(item) === "planned");

  return (
    <div className="flex flex-col gap-1.5 border-t border-[var(--ht-input-border)] py-2.5 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--ht-text)]">
          {mealLabel}
        </span>
        <span className="flex items-center gap-2">
          {!filtered && hasPlanned && (
            <button
              type="button"
              aria-label={`Tout marquer préparé, ${mealLabel}`}
              onClick={() => void save(markPlannedAsPrepared(slot))}
              className="ht-btn px-2 py-0.5 text-xs"
            >
              Tout préparé
            </button>
          )}
          {/* Un snack se prépare par quantité, pas par nombre de convives. */}
          {!isSnack && !filtered && (
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
        </span>
      </div>

      {visible.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {visible.map(({ item, index }) => {
            const status = itemStatus(item);
            const translation = itemTranslation(item, translations);
            return (
              <li
                key={`${item.label}-${index}`}
                className={`ht-pill ${STATUS_PILL[status]} flex max-w-full items-center gap-1`}
                style={WRAP_STYLE}
                data-status={status}
              >
                <button
                  type="button"
                  aria-label={`Modifier ${item.label}`}
                  onClick={() =>
                    setEditing({
                      index,
                      label: item.label,
                      translation: translation ?? "",
                    })
                  }
                  dir="auto"
                  className="min-w-0 break-words text-left"
                >
                  {/* Le nom sur une ligne, sa traduction (si elle existe) dessous. */}
                  <span
                    className={`block ${status === "skipped" ? "line-through" : ""}`}
                  >
                    {item.label}
                  </span>
                  {translation && (
                    <span className="block font-normal text-[var(--ht-text-2)]">
                      {translation}
                    </span>
                  )}
                  {status === "skipped" && (
                    <span className="block font-normal">
                      Non préparé{item.skipReason ? ` · ${item.skipReason}` : ""}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Marquer ${item.label} comme préparé`}
                  aria-pressed={status === "prepared"}
                  onClick={() =>
                    setStatus(index, status === "prepared" ? "planned" : "prepared")
                  }
                  className={`leading-none ${status === "prepared" ? "" : "opacity-50"}`}
                >
                  ✓
                </button>
                <button
                  type="button"
                  aria-label={`Marquer ${item.label} comme non préparé`}
                  aria-pressed={status === "skipped"}
                  onClick={() => {
                    if (status === "skipped") setStatus(index, "planned");
                    else setSkipPicker(skipPicker === index ? null : index);
                  }}
                  className={`leading-none ${status === "skipped" ? "" : "opacity-50"}`}
                >
                  ✗
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
            );
          })}
        </ul>
      )}

      {skipPicker !== null && slot.items[skipPicker] && (
        <div
          role="group"
          aria-label={`Motif, ${slot.items[skipPicker].label}`}
          className="flex flex-wrap items-center gap-1.5 text-xs"
        >
          <span className="text-[var(--ht-text-2)]">
            Pourquoi « {slot.items[skipPicker].label} » n&apos;a pas été préparé ?
          </span>
          {SKIP_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setStatus(skipPicker, "skipped", reason)}
              className="ht-btn px-2 py-0.5"
            >
              {reason}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setStatus(skipPicker, "skipped")}
            className="ht-btn px-2 py-0.5"
          >
            Sans motif
          </button>
          <button
            type="button"
            onClick={() => setSkipPicker(null)}
            className="text-[var(--ht-text-2)]"
          >
            Annuler
          </button>
        </div>
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

      {/* Sous un filtre, on consulte : pas de saisie (un plat ajouté serait
          « planifié » et disparaîtrait aussitôt du filtre actif). */}
      {!filtered && (
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
      )}
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
  filter = "all",
}: {
  plan: MealPlan;
  dishes?: Dish[];
  translations?: TranslationIndex;
  filter?: StatusFilter;
}) {
  const filteredPlan = filterPlan(plan, filter);
  const days = daysOfWeek(plan.weekId).filter(
    (day) =>
      filter === "all" ||
      MEALS.some(
        (meal) =>
          (filteredPlan.slots[slotKey(day.key, meal.key)]?.items.length ?? 0) > 0 ||
          (meal.key === "snack" && snacksForDay(filteredPlan, day.key).items.length > 0),
      ),
  );

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
      {days.length === 0 && (
        <p className="text-[var(--ht-text-2)]">
          Aucun plat ne correspond à ce filtre.
        </p>
      )}
      {days.map((day) => (
        <section key={day.key} id={`day-${day.key}`} className="ht-card p-4">
          <h3 className="mb-1 text-sm font-extrabold text-[var(--ht-text)]">
            {day.fr} {day.date.getDate()}
          </h3>
          {MEALS.map((meal) => (
            <SlotEditor
              key={meal.key}
              plan={plan}
              filteredPlan={filteredPlan}
              filter={filter}
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
