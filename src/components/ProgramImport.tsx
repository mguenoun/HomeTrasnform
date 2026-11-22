import { useState } from "react";
import { parseProgramText } from "../domain/mealImport";
import { saveMealSlots } from "../services/meals";

/**
 * Import du programme depuis un texte collé : une ligne par jour,
 * "السبت : snacks | déjeuner | dîner", repas composés séparés par "+".
 * Les créneaux collés remplacent ceux de la semaine ; les autres sont gardés.
 */
export function ProgramImport({ weekId }: { weekId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleImport() {
    const { slots, ignored } = parseProgramText(text);
    const count = Object.keys(slots).length;
    if (count === 0) {
      setError(
        "Aucun repas reconnu. Format attendu : « السبت : snacks | déjeuner | dîner », un jour par ligne.",
      );
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await saveMealSlots(weekId, slots);
      setMessage(
        `${count} créneaux importés` +
          (ignored.length > 0
            ? `, ${ignored.length} ligne(s) ignorée(s) (jour non reconnu).`
            : "."),
      );
      setText("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'import. Réessayez.",
      );
    } finally {
      setBusy(false);
    }
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
          }}
          className="text-sm text-[var(--ht-text-2)]"
        >
          Fermer
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Programme à importer"
        dir="auto"
        rows={8}
        placeholder={"السبت : شينز كيك | كسكسو + سلاض | شعرية الحليب"}
        className="ht-input"
      />
      <p className="text-xs text-[var(--ht-text-2)]">
        Une ligne par jour : snacks | déjeuner | dîner. « + » sépare les éléments
        d&apos;un repas. Les créneaux collés remplacent ceux de la semaine.
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
