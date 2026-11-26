import { useState } from "react";
import { catalogKey } from "../domain/catalog";
import { COURSES, COURSE_LABEL, dishCourse, isSnackDish } from "../domain/dishes";
import type { Dish } from "../types";

/**
 * Choix d'un plat dans la bibliothèque, pour l'ajouter à un repas sans le retaper :
 * les plats d'un repas sont groupés (plats principaux, entrées, accompagnements,
 * desserts) ; un créneau de snacks ne montre que les snacks. Plusieurs plats peuvent
 * être ajoutés à la suite ; un plat déjà dans le repas n'est pas proposé.
 */
export function DishPicker({
  dishes,
  snack,
  already,
  mealLabel,
  onPick,
  onClose,
}: {
  dishes: Dish[];
  snack: boolean;
  /** Plats déjà dans le repas (noms). */
  already: string[];
  mealLabel: string;
  onPick: (dish: Dish) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const needle = catalogKey(search);
  const present = new Set(already.map(catalogKey));
  const candidates = dishes
    .filter((d) => isSnackDish(d) === snack && !present.has(catalogKey(d.name)))
    .filter(
      (d) =>
        !needle ||
        catalogKey(d.name).includes(needle) ||
        catalogKey(d.translation ?? "").includes(needle),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const groups = snack
    ? [{ title: "Snacks", items: candidates }]
    : COURSES.map((course) => ({
        title: `${COURSE_LABEL[course]}s`,
        items: candidates.filter((d) => dishCourse(d) === course),
      }));

  return (
    <div
      role="group"
      aria-label={`Bibliothèque, ${mealLabel}`}
      className="flex flex-col gap-2 rounded-lg border border-[var(--ht-input-border)] p-2.5"
    >
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          aria-label={`Rechercher dans la bibliothèque, ${mealLabel}`}
          dir="auto"
          className="ht-input min-w-0 flex-1"
        />
        <button type="button" onClick={onClose} className="ht-btn px-3 py-1.5 text-sm">
          Fermer
        </button>
      </div>
      {candidates.length === 0 ? (
        <p className="text-xs text-[var(--ht-text-2)]">Aucun plat à proposer.</p>
      ) : (
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {groups
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.title} className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-[var(--ht-text-2)]">{group.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((dish) => (
                    <button
                      key={dish.id}
                      type="button"
                      aria-label={`Ajouter ${dish.name}, ${mealLabel}`}
                      onClick={() => onPick(dish)}
                      dir="auto"
                      className="ht-pill ht-pill-neutral"
                      style={{ whiteSpace: "normal", borderRadius: 12 }}
                    >
                      + {dish.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
