import { useMemo, useState } from "react";
import { catalogKey } from "../domain/catalog";
import {
  MEAL_TYPE_LABEL,
  dishMealType,
  inferMealTypes,
  isSnackDish,
} from "../domain/dishes";
import { computeDishStats } from "../domain/feedback";
import { MEALS, daysOfWeek, slotKey } from "../domain/mealPlan";
import { generateProgram, type GeneratedProgram } from "../domain/programGenerator";
import { useAllMealPlans } from "../hooks/useMeals";
import { saveWholeSlots } from "../services/meals";
import type { Dish, MealPlan } from "../types";

/**
 * Compose une première version du programme : on coche les plats de la semaine (et les
 * snacks) dans le référentiel, l'app les répartit sur les déjeuners et dîners libres selon
 * leur repas habituel, on regarde le résultat, on relance une autre répartition si besoin,
 * puis on l'applique. Rien n'est écrit avant « Appliquer », et un créneau déjà rempli
 * n'est jamais touché.
 */
export function ProgramGenerator({
  weekId,
  plan,
  dishes,
}: {
  weekId: string;
  plan: MealPlan;
  dishes: Dish[];
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ht-btn mb-3 self-start px-3 py-1.5 text-sm"
      >
        Composer le programme
      </button>
    );
  }
  // Le panneau n'existe (et n'écoute tous les programmes) que lorsqu'il est ouvert.
  return (
    <GeneratorPanel
      weekId={weekId}
      plan={plan}
      dishes={dishes}
      onClose={() => setOpen(false)}
    />
  );
}

function GeneratorPanel({
  weekId,
  plan,
  dishes,
  onClose,
}: {
  weekId: string;
  plan: MealPlan;
  dishes: Dish[];
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [seed, setSeed] = useState(1);
  const [preview, setPreview] = useState<GeneratedProgram | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allPlans = useAllMealPlans();
  const inferred = useMemo(() => inferMealTypes(allPlans), [allPlans]);
  const stats = useMemo(() => computeDishStats(allPlans), [allPlans]);

  const freeMeals = daysOfWeek(weekId)
    .flatMap((d) => [slotKey(d.key, "lunch"), slotKey(d.key, "dinner")])
    .filter((key) => (plan.slots[key]?.items.length ?? 0) === 0).length;

  const needle = catalogKey(search);
  const matches = (dish: Dish) =>
    !needle ||
    catalogKey(dish.name).includes(needle) ||
    catalogKey(dish.translation ?? "").includes(needle);
  const mealDishes = dishes
    .filter((d) => !isSnackDish(d) && matches(d))
    .sort((a, b) => a.name.localeCompare(b.name));
  const snackDishes = dishes
    .filter((d) => isSnackDish(d) && matches(d))
    .sort((a, b) => a.name.localeCompare(b.name));

  const pickedMeals = dishes.filter((d) => !isSnackDish(d) && picked.has(d.id));
  const pickedSnacks = dishes.filter((d) => isSnackDish(d) && picked.has(d.id));

  function toggle(id: string) {
    setPreview(null);
    setMessage(null);
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function generate(nextSeed: number) {
    setSeed(nextSeed);
    setMessage(null);
    setError(null);
    setPreview(
      generateProgram({
        plan,
        meals: pickedMeals.map((d) => ({
          label: d.name,
          translation: d.translation,
          // Étiquette enregistrée, sinon déduite ; inconnue = peut aller aux deux repas.
          type: dishMealType(d, inferred).type ?? "both",
        })),
        snacks: pickedSnacks.map((d) => ({ label: d.name, translation: d.translation })),
        seed: nextSeed,
      }),
    );
  }

  async function apply() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      // Un créneau rempli entre-temps (autre membre) n'est pas écrasé.
      const slots = Object.fromEntries(
        Object.entries(preview.slots).filter(
          ([key]) => (plan.slots[key]?.items.length ?? 0) === 0,
        ),
      );
      await saveWholeSlots(weekId, slots);
      setMessage(
        `${Object.keys(slots).length} créneau${Object.keys(slots).length > 1 ? "x" : ""} ajouté${Object.keys(slots).length > 1 ? "s" : ""} au programme. Ajustez-le dans le calendrier.`,
      );
      setPreview(null);
      setPicked(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  const row = (dish: Dish) => {
    const { type, inferred: guessed } = isSnackDish(dish)
      ? { type: undefined, inferred: false }
      : dishMealType(dish, inferred);
    const s = stats.get(catalogKey(dish.name));
    return (
      <li key={dish.id}>
        <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm">
          <input
            type="checkbox"
            checked={picked.has(dish.id)}
            onChange={() => toggle(dish.id)}
            aria-label={`Choisir ${dish.name}`}
          />
          <span dir="auto" className="min-w-0 flex-1 break-words text-[var(--ht-text)]">
            {dish.name}
            {dish.translation && (
              <span className="text-[var(--ht-text-2)]"> — {dish.translation}</span>
            )}
          </span>
          {type && (
            <span className="ht-pill ht-pill-info" style={{ whiteSpace: "normal" }}>
              {MEAL_TYPE_LABEL[type]}
              {guessed && " (déduit)"}
            </span>
          )}
          {s && (
            <span className="text-xs text-[var(--ht-text-2)]">
              servi {s.served}×{s.up + s.down > 0 && ` · 👍 ${s.up} · 👎 ${s.down}`}
            </span>
          )}
        </label>
      </li>
    );
  };

  return (
    <section className="ht-card mb-3 flex flex-col gap-3 p-4" aria-label="Composer le programme">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-[var(--ht-text)]">Composer le programme</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-[var(--ht-text-2)]"
        >
          Fermer
        </button>
      </div>

      <p className="text-xs text-[var(--ht-text-2)]">
        Cochez les plats de la semaine ({freeMeals} déjeuners et dîners libres) et quelques
        snacks. L&apos;app les répartit selon leur repas habituel ; rien n&apos;est écrit
        avant « Appliquer », et ce qui est déjà saisi n&apos;est pas touché.
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un plat…"
        aria-label="Rechercher dans les plats à choisir"
        dir="auto"
        className="ht-input"
      />

      {dishes.length === 0 ? (
        <p className="text-sm text-[var(--ht-text-2)]">
          Le référentiel est vide : les plats s&apos;y ajoutent quand vous remplissez le
          programme.
        </p>
      ) : (
        <>
          <p className="text-sm font-semibold text-[var(--ht-text)]">
            Plats ({pickedMeals.length} choisi{pickedMeals.length > 1 ? "s" : ""} sur {freeMeals} places)
          </p>
          <ul className="max-h-72 divide-y divide-[var(--ht-input-border)] overflow-y-auto rounded-lg border border-[var(--ht-input-border)]">
            {mealDishes.map(row)}
          </ul>
          {snackDishes.length > 0 && (
            <>
              <p className="text-sm font-semibold text-[var(--ht-text)]">
                Snacks ({pickedSnacks.length} choisi{pickedSnacks.length > 1 ? "s" : ""})
              </p>
              <ul className="max-h-48 divide-y divide-[var(--ht-input-border)] overflow-y-auto rounded-lg border border-[var(--ht-input-border)]">
                {snackDishes.map(row)}
              </ul>
            </>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => generate(seed)}
          disabled={pickedMeals.length + pickedSnacks.length === 0}
          className="ht-btn-cta-sm"
        >
          Générer le programme
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => generate(seed + 1)}
            className="ht-btn px-3 py-1.5 text-sm"
          >
            Autre répartition
          </button>
        )}
      </div>

      {preview && (
        <div className="flex flex-col gap-2" aria-label="Aperçu du programme généré" role="region">
          <ul className="divide-y divide-[var(--ht-input-border)] rounded-lg border border-[var(--ht-input-border)] text-sm">
            {daysOfWeek(weekId).map((day) => {
              const cells = MEALS.map((meal) => {
                const key = slotKey(day.key, meal.key);
                const generated = preview.slots[key]?.items[0]?.label;
                const existing = plan.slots[key]?.items.map((i) => i.label).join(" + ");
                return { meal, generated, existing };
              }).filter((c) => c.generated || c.existing);
              if (cells.length === 0) return null;
              return (
                <li key={day.key} className="px-3 py-1.5">
                  <span className="font-semibold text-[var(--ht-text)]">
                    {day.fr} {day.date.getDate()}
                  </span>
                  {cells.map(({ meal, generated, existing }) => (
                    <span
                      key={meal.key}
                      dir="auto"
                      className={`block break-words ${generated ? "text-[var(--ht-text)]" : "text-[var(--ht-text-2)]"}`}
                    >
                      {meal.fr} : {generated ?? existing}
                    </span>
                  ))}
                </li>
              );
            })}
          </ul>
          {preview.misplaced.length > 0 && (
            <p className="text-xs text-[var(--ht-text-2)]">
              Servi à l&apos;autre repas que d&apos;habitude, faute de place :{" "}
              <span dir="auto">{preview.misplaced.join(", ")}</span>.
            </p>
          )}
          {preview.unplaced.length > 0 && (
            <p role="alert" className="text-sm text-[var(--ht-danger)]">
              Pas de créneau libre pour : <span dir="auto">{preview.unplaced.join(", ")}</span>.
            </p>
          )}
          {preview.unplacedSnacks.length > 0 && (
            <p role="alert" className="text-sm text-[var(--ht-danger)]">
              Pas de jour libre pour les snacks : <span dir="auto">{preview.unplacedSnacks.join(", ")}</span>.
            </p>
          )}
          <button
            type="button"
            onClick={() => void apply()}
            disabled={busy || Object.keys(preview.slots).length === 0}
            className="ht-btn-cta-sm self-start"
          >
            Appliquer au programme
          </button>
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
