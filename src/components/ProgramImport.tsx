import { useState } from "react";
import { parseProgramText } from "../domain/mealImport";
import { mergeImportedSlots, type MergedImport } from "../domain/weekCopy";
import { saveMealSlots } from "../services/meals";
import type { MealPlan } from "../types";

/**
 * Import du programme depuis un texte collé : une ligne par jour,
 * "السبت : snacks | déjeuner | dîner", repas composés séparés par "+".
 * Les créneaux collés remplacent ceux de la semaine ; les autres sont gardés. Un plat
 * déjà présent garde son statut et ses votes ; si l'import fait disparaître des plats,
 * on demande confirmation avant d'écrire.
 */
export function ProgramImport({
  weekId,
  plan,
}: {
  weekId: string;
  plan: MealPlan;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    merged: MergedImport;
    ignored: number;
  } | null>(null);

  async function write(merged: MergedImport, ignored: number) {
    setError(null);
    setBusy(true);
    try {
      await saveMealSlots(weekId, merged.slots);
      const count = Object.keys(merged.slots).length;
      setMessage(
        `${count} créneaux importés` +
          (merged.kept > 0 ? `, ${merged.kept} plat(s) déjà en place conservé(s) avec leur statut` : "") +
          (ignored > 0 ? `, ${ignored} ligne(s) ignorée(s) (jour non reconnu).` : "."),
      );
      setText("");
      setPending(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'import. Réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setMessage(null);
    const { slots, ignored } = parseProgramText(text);
    if (Object.keys(slots).length === 0) {
      setError(
        "Aucun repas reconnu. Format attendu : « السبت : snacks | déjeuner | dîner », un jour par ligne.",
      );
      return;
    }
    const merged = mergeImportedSlots(plan, slots);
    // Rien ne disparaît : on écrit tout de suite. Sinon, on montre l'effet d'abord.
    if (merged.removed > 0) {
      setError(null);
      setPending({ merged, ignored: ignored.length });
      return;
    }
    await write(merged, ignored.length);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ht-btn mb-3 self-start px-3 py-1.5 text-sm"
      >
        Coller le programme
      </button>
    );
  }

  return (
    <section className="ht-card mb-3 flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-[var(--ht-text)]">
          Importer le programme
        </h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setMessage(null);
            setError(null);
            setPending(null);
          }}
          className="text-sm text-[var(--ht-text-2)]"
        >
          Fermer
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPending(null);
        }}
        aria-label="Programme à importer"
        dir="auto"
        rows={8}
        placeholder={"السبت : شينز كيك | كسكسو + سلاض | شعرية الحليب"}
        className="ht-input"
      />
      <p className="text-xs text-[var(--ht-text-2)]">
        Une ligne par jour : snacks | déjeuner | dîner. « + » sépare les éléments
        d&apos;un repas. Les créneaux collés remplacent ceux de la semaine ; un plat
        déjà en place garde son statut et ses votes.
      </p>
      {error && (
        <p role="alert" className="text-sm text-[var(--ht-danger)]">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-[var(--ht-text)]">
          {message}
        </p>
      )}
      {pending && (
        <div
          role="group"
          aria-label="Confirmer l'import"
          className="flex flex-col gap-2 rounded-lg border border-[var(--ht-danger)] p-3 text-sm text-[var(--ht-text)]"
        >
          <p>
            Cet import retire {pending.merged.removed} plat
            {pending.merged.removed > 1 ? "s" : ""} déjà saisi
            {pending.merged.removed > 1 ? "s" : ""} dans {pending.merged.replaced} créneau
            {pending.merged.replaced > 1 ? "x" : ""}
            {pending.merged.removedWithStatus > 0
              ? `, dont ${pending.merged.removedWithStatus} déjà marqué${pending.merged.removedWithStatus > 1 ? "s" : ""} préparé ou non préparé (statut et votes perdus)`
              : ""}
            . Continuer ?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void write(pending.merged, pending.ignored)}
              disabled={busy}
              className="rounded-md border border-[var(--ht-danger)] bg-[var(--ht-danger)] px-3 py-1 font-semibold text-white"
            >
              Importer quand même
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="ht-btn px-3 py-1"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => void handleImport()}
        disabled={busy || !text.trim()}
        className="ht-btn-cta-sm self-start"
      >
        Importer
      </button>
    </section>
  );
}
