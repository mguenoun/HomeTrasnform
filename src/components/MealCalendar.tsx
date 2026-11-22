import { useRef } from "react";
import { MEALS, daysOfWeek, dinersOf, itemTranslation, slotKey, snacksForDay } from "../domain/mealPlan";
import { itemStatus } from "../domain/mealStatus";
import type { TranslationIndex } from "../domain/translations";
import type { MealItem, MealPlan } from "../types";

/** Largeur minimale du tableau : en dessous, il défile horizontalement. */
const TABLE_MIN_WIDTH = "34rem";

function Items({
  items,
  translations,
  muted,
}: {
  items: MealItem[];
  translations?: TranslationIndex;
  muted?: boolean;
}) {
  return (
    <ul className={`flex flex-col gap-1 ${muted ? "italic opacity-70" : ""}`}>
      {items.map((item, index) => {
        const translation = itemTranslation(item, translations);
        const status = itemStatus(item);
        return (
          <li key={`${item.label}-${index}`} className="leading-snug">
            {/* L'arabe sur sa ligne, le français (quand il existe) dessous. */}
            <span
              dir="auto"
              className={`block break-words ${status === "skipped" ? "line-through" : ""}`}
            >
              {status === "prepared" && <span aria-label="préparé">✓ </span>}
              {status === "skipped" && <span aria-label="non préparé">✗ </span>}
              {item.label}
            </span>
            {translation && (
              <span
                dir="auto"
                className="block break-words text-[10px] text-[var(--ht-text-2)]"
              >
                {translation}
              </span>
            )}
            {status === "skipped" && item.skipReason && (
              <span className="block break-words text-[10px] text-[var(--ht-text-2)]">
                {item.skipReason}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Vue d'ensemble de la semaine, comme le cahier : un jour par ligne, trois
 * colonnes (snacks, déjeuner, dîner). Sur un petit écran le tableau défile
 * horizontalement (flèches de chaque côté) avec la colonne des jours figée.
 * Les snacks d'un jour vide sont ceux du dernier jour non vide, en italique ;
 * un tap sur un jour ouvre son détail.
 */
export function MealCalendar({
  plan,
  onSelectDay,
  translations,
}: {
  plan: MealPlan;
  onSelectDay: (dayKey: string) => void;
  translations?: TranslationIndex;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy?.({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div ref={scroller} className="ht-card overflow-x-auto">
        <table
          className="w-full table-fixed border-collapse text-xs"
          style={{ minWidth: TABLE_MIN_WIDTH }}
        >
          <thead>
            <tr className="text-[var(--ht-text-2)]">
              <th
                scope="col"
                className="sticky left-0 z-10 w-14 bg-[var(--ht-card-solid)] p-2 text-left font-semibold"
              >
                <span className="sr-only">Jour</span>
              </th>
              {MEALS.map((meal) => (
                <th
                  key={meal.key}
                  scope="col"
                  className="p-2 text-left font-semibold"
                >
                  {meal.fr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daysOfWeek(plan.weekId).map((day) => {
              const snacks = snacksForDay(plan, day.key);
              return (
                <tr
                  key={day.key}
                  className="border-t border-[var(--ht-input-border)] align-top"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-[var(--ht-card-solid)] p-2 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectDay(day.key)}
                      aria-label={`Détail du ${day.fr.toLowerCase()} ${day.date.getDate()}`}
                      className="text-left font-extrabold text-[var(--ht-text)]"
                    >
                      {day.fr.slice(0, 3)}.
                      <span className="block font-normal text-[var(--ht-text-2)]">
                        {day.date.getDate()}
                      </span>
                    </button>
                  </th>
                  {MEALS.map((meal) => {
                    const slot = plan.slots[slotKey(day.key, meal.key)];
                    const isSnack = meal.key === "snack";
                    const items = isSnack ? snacks.items : (slot?.items ?? []);
                    return (
                      <td
                        key={meal.key}
                        data-testid={`cell-${day.key}-${meal.key}`}
                        className="p-2 text-[var(--ht-text)]"
                      >
                        {items.length > 0 ? (
                          <>
                            <Items
                              items={items}
                              translations={translations}
                              muted={isSnack && !!snacks.inheritedFrom}
                            />
                            {!isSnack && (
                              <span className="mt-1 block text-[10px] text-[var(--ht-text-2)]">
                                {dinersOf(plan, slot)} p.
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[var(--ht-text-2)]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        aria-label="Défiler le calendrier vers la gauche"
        onClick={() => scroll(-1)}
        className="ht-btn absolute top-1/2 left-1 z-20 h-8 w-8 -translate-y-1/2 p-0 opacity-90"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Défiler le calendrier vers la droite"
        onClick={() => scroll(1)}
        className="ht-btn absolute top-1/2 right-1 z-20 h-8 w-8 -translate-y-1/2 p-0 opacity-90"
      >
        ›
      </button>
    </div>
  );
}
