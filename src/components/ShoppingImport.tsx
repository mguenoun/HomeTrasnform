import { useState } from "react";
import { toDateInputValue } from "../domain/expenses";
import { DEFAULT_VENDORS } from "../domain/mealPlan";
import { parseShoppingText, type ParsedShoppingGroup } from "../domain/mealImport";
import { addExpense, addShoppingItems } from "../services/meals";

interface GroupDraft {
  group: ParsedShoppingGroup;
  vendor: string;
  amount: string;
}

/**
 * Import d'une liste collée depuis WhatsApp. Le texte ne dit pas chez qui on
 * achète chaque groupe : on prévisualise donc les groupes pour que l'utilisateur
 * y associe un point de vente (et ajuste le montant payé) avant d'enregistrer.
 */
export function ShoppingImport({
  weekId,
  userId,
  knownVendors,
}: {
  weekId: string;
  userId: string;
  knownVendors: string[];
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<GroupDraft[] | null>(null);
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const vendors = [...new Set([...DEFAULT_VENDORS, ...knownVendors])];

  function analyse() {
    const groups = parseShoppingText(text);
    if (groups.length === 0) {
      setError("Aucun article reconnu dans ce texte.");
      return;
    }
    setError(null);
    setDrafts(
      groups.map((group) => ({
        group,
        vendor: group.vendor ?? "",
        amount: group.amount === undefined ? "" : String(group.amount),
      })),
    );
  }

  function update(index: number, patch: Partial<GroupDraft>) {
    setDrafts(
      (current) =>
        current?.map((d, i) => (i === index ? { ...d, ...patch } : d)) ?? null,
    );
  }

  async function confirm() {
    if (!drafts) return;
    const missingVendor = drafts.findIndex(
      (d) => d.amount.trim() !== "" && Number(d.amount) > 0 && !d.vendor.trim(),
    );
    if (missingVendor >= 0) {
      setError(
        `Groupe ${missingVendor + 1} : indiquez le point de vente pour enregistrer le montant payé.`,
      );
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await addShoppingItems(
        weekId,
        drafts.flatMap((d) =>
          d.group.items.map((item) => ({ ...item, vendor: d.vendor })),
        ),
      );
      for (const d of drafts) {
        const amount = Number(d.amount);
        if (d.amount.trim() !== "" && amount > 0) {
          await addExpense({
            type: "groceries",
            amount,
            date,
            weekId,
            vendor: d.vendor,
            createdBy: userId,
          });
        }
      }
      setText("");
      setDrafts(null);
      setOpen(false);
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
        className="ht-btn self-start px-3 py-1.5 text-sm"
      >
        Coller une liste WhatsApp
      </button>
    );
  }

  return (
    <section className="ht-card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-[var(--ht-text)]">
          Importer une liste
        </h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setDrafts(null);
            setError(null);
          }}
          className="text-sm text-[var(--ht-text-2)]"
        >
          Fermer
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--ht-danger)]">
          {error}
        </p>
      )}

      {!drafts && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Liste à importer"
            dir="auto"
            rows={8}
            placeholder={"—كيلو بطاطة\n—5دراهم كمون\n187dh"}
            className="ht-input"
          />
          <p className="text-xs text-[var(--ht-text-2)]">
            Une ligne par article. Une ligne de montant seul (ex. 187dh) clôt un
            groupe d&apos;articles payés ensemble, une ligne vide sépare deux groupes, et
            une ligne « # Boucher » donne le point de vente des groupes qui suivent.
          </p>
          <button
            type="button"
            onClick={analyse}
            disabled={!text.trim()}
            className="ht-btn-cta-sm self-start"
          >
            Analyser
          </button>
        </>
      )}

      {drafts && (
        <>
          <label className="flex items-center gap-2 text-sm text-[var(--ht-text-2)]">
            Date des paiements
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="ht-input py-1"
            />
          </label>
          <datalist id="import-vendors">
            {vendors.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          {drafts.map((d, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-lg border border-[var(--ht-input-border)] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[var(--ht-text-2)]">
                  Groupe {index + 1} · {d.group.items.length} article
                  {d.group.items.length > 1 ? "s" : ""}
                </span>
                <input
                  value={d.vendor}
                  onChange={(e) => update(index, { vendor: e.target.value })}
                  list="import-vendors"
                  placeholder="Point de vente"
                  aria-label={`Point de vente, groupe ${index + 1}`}
                  className="ht-input w-40 py-1"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={d.amount}
                  onChange={(e) => update(index, { amount: e.target.value })}
                  placeholder="Payé"
                  aria-label={`Montant payé, groupe ${index + 1}`}
                  className="ht-input w-24 py-1 text-right"
                />
                <span className="text-xs text-[var(--ht-text-2)]">MAD</span>
              </div>
              <p dir="auto" className="text-xs text-[var(--ht-text-2)]">
                {d.group.items
                  .map((i) => (i.quantity ? `${i.name} (${i.quantity})` : i.name))
                  .join(" · ")}
              </p>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy}
              className="ht-btn-cta-sm"
            >
              Importer{" "}
              {drafts.reduce((n, d) => n + d.group.items.length, 0)} articles
            </button>
            <button
              type="button"
              onClick={() => setDrafts(null)}
              disabled={busy}
              className="ht-btn px-3 py-1.5 text-sm"
            >
              Retour
            </button>
          </div>
        </>
      )}
    </section>
  );
}
