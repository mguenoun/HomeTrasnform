import { MEALS, daysOfWeek, dinersOf, slotKey, snacksForDay } from "../domain/mealPlan";
import type { MealItem, MealPlan } from "../types";

function Items({ items, muted }: { items: MealItem[]; muted?: boolean }) {
  return (
    <ul className={`flex flex-col gap-0.5 ${muted ? "italic opacity-70" : ""}`}>
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} dir="auto" className="leading-snug">
          {item.label}
          {item.translation && (
            <span className="block text-[10px] text-[var(--ht-text-2)]">
              {item.translation}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Vue d'ensemble de la semaine, comme le cahier : un jour par ligne, trois
 * colonnes (snacks, déjeuner, dîner). Les snacks d'un jour vide sont ceux du
 * dernier jour non vide, en italique. Un tap sur un jour ouvre son détail.
 */
export function MealCalendar({
  plan,
  onSelectDay,
}: {
  plan: MealPlan;
  onSelectDay: (dayKey: string) => void;
}) {
  return (
    <div className="ht-card overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-xs">
        <thead>
          <tr className="text-[var(--ht-text-2)]">
            <th scope="col" className="w-16 p-2 text-left font-semibold">
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
                <th scope="row" className="p-2 text-left">
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
                            muted={isSnack && !!snacks.inheritedFrom}
                          />
                          {!isSnack && (
                            <span className="mt-0.5 block text-[10px] text-[var(--ht-text-2)]">
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
  );
}
