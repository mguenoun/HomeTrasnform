import { useState, type FormEvent } from "react";
import {
  DAYS,
  MEALS,
  datesOfWeek,
  dinersOf,
  slotKey,
} from "../domain/mealPlan";
import { saveMealSlot } from "../services/meals";
import type { MealPlan, MealSlot } from "../types";

const EMPTY_SLOT: MealSlot = { items: [] };

function SlotEditor({
  plan,
  dayKey,
  mealKey,
  mealLabel,
}: {
  plan: MealPlan;
  dayKey: string;
  mealKey: string;
  mealLabel: string;
}) {
  const key = slotKey(dayKey, mealKey);
  const slot = plan.slots[key] ?? EMPTY_SLOT;
  const diners = dinersOf(plan, slot);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    const label = draft.trim();
    if (!label) return;
    setDraft("");
    void save({ ...slot, items: [...slot.items, { label }] });
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-[var(--ht-input-border)] py-2.5 first:border-t-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--ht-text)]">
          {mealLabel}
        </span>
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
          <span aria-label={`Convives, ${mealLabel}`} className="min-w-[2.5ch] text-center">
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
      </div>

      {slot.items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {slot.items.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              className="ht-pill ht-pill-neutral flex items-center gap-1"
            >
              <span dir="auto">{item.label}</span>
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

      <form onSubmit={handleAdd} className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ajouter un plat…"
          aria-label={`Ajouter un plat, ${mealLabel}`}
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

export function MealWeekPlan({ plan }: { plan: MealPlan }) {
  const dates = datesOfWeek(plan.weekId);
  return (
    <div className="flex flex-col gap-3">
      {DAYS.map((day, i) => (
        <section key={day.key} className="ht-card p-4">
          <h3 className="mb-1 text-sm font-extrabold text-[var(--ht-text)]">
            {day.fr} {dates[i].getDate()}
          </h3>
          {MEALS.map((meal) => (
            <SlotEditor
              key={meal.key}
              plan={plan}
              dayKey={day.key}
              mealKey={meal.key}
              mealLabel={meal.fr}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
