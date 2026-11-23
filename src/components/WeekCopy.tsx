import { useState } from "react";
import { formatWeekRange } from "../domain/mealPlan";
import { copyPreviousWeek } from "../domain/weekCopy";
import { saveWholeSlots } from "../services/meals";
import type { MealPlan } from "../types";

/**
 * Prépare la semaine à partir de la précédente : les plats et les convives, sans les
 * statuts ni les votes. Seuls les créneaux encore vides sont remplis : cette recopie ne
 * remplace jamais ce qui est déjà saisi.
 */
export function WeekCopy({
  previous,
  current,
}: {
  previous: MealPlan;
  current: MealPlan;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const plan = copyPreviousWeek(previous, current);
  const hasPrevious = Object.values(previous.slots).some((s) => s.items.length > 0);
  if (!hasPrevious && !message) return null;
  // Tout est déjà rempli : rien à proposer (le message de réussite reste affiché).
  if (plan.copied === 0 && !message) return null;

  async function handleCopy() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await saveWholeSlots(current.weekId, plan.slots);
      setMessage(
        `${plan.copied} créneau${plan.copied > 1 ? "x" : ""} recopié${plan.copied > 1 ? "s" : ""}` +
          (plan.skipped > 0
            ? ` ; ${plan.skipped} déjà rempli${plan.skipped > 1 ? "s" : ""} cette semaine, conservé${plan.skipped > 1 ? "s" : ""}.`
            : "."),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de la recopie. Réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 flex flex-col gap-1.5 self-start">
      {plan.copied > 0 && (
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={busy}
          className="ht-btn px-3 py-1.5 text-sm"
        >
          Recopier la semaine du {formatWeekRange(previous.weekId)}
        </button>
      )}
      {plan.copied > 0 && (
        <p className="text-xs text-[var(--ht-text-2)]">
          {plan.copied} créneau{plan.copied > 1 ? "x" : ""} à recopier (plats et convives, sans
          statut ni votes). Ce qui est déjà saisi cette semaine n&apos;est pas touché.
        </p>
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
    </div>
  );
}
