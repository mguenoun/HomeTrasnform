import { useState, type FormEvent } from "react";
import { DEFAULT_VENDORS, groupByVendor } from "../domain/mealPlan";
import { formatMad } from "../domain/money";
import {
  addShoppingItem,
  removeShoppingItem,
  setShoppingItemChecked,
  setVendorAmount,
} from "../services/meals";
import type { ShoppingList } from "../types";

export function ShoppingListView({ list }: { list: ShoppingList }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [vendor, setVendor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const items = Object.values(list.items);
  const groups = groupByVendor(items);
  const knownVendors = [
    ...new Set([
      ...DEFAULT_VENDORS,
      ...items.map((i) => i.vendor).filter((v): v is string => !!v),
    ]),
  ];
  const total = Object.values(list.vendorAmounts).reduce((a, b) => a + b, 0);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'enregistrement.",
      );
    }
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const input = { name, quantity, vendor };
    // Le point de vente est conservé : on saisit souvent plusieurs articles
    // d'affilée chez le même commerçant.
    setName("");
    setQuantity("");
    void run(() => addShoppingItem(list.weekId, input));
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={handleAdd}
        className="ht-card flex flex-col gap-2 p-4 sm:flex-row"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Article (ex. شعرية)"
          aria-label="Article"
          dir="auto"
          className="ht-input flex-1"
        />
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantité (ex. 2 kg, 5 DH)"
          aria-label="Quantité"
          dir="auto"
          className="ht-input sm:w-40"
        />
        <input
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          placeholder="Point de vente"
          aria-label="Point de vente"
          list="meal-vendors"
          className="ht-input sm:w-40"
        />
        <datalist id="meal-vendors">
          {knownVendors.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <button type="submit" className="ht-btn-cta-sm">
          Ajouter
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-[var(--ht-danger)]">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-[var(--ht-text-2)]">
          Aucun article pour cette semaine.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.vendor || "__none"} className="ht-card">
            <div className="flex items-center justify-between gap-3 px-4 pt-3">
              <h3 className="text-sm font-extrabold text-[var(--ht-text)]">
                {group.vendor || "Sans point de vente"}
              </h3>
              {group.vendor && (
                <label className="flex items-center gap-1.5 text-xs text-[var(--ht-text-2)]">
                  Payé
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    aria-label={`Montant payé, ${group.vendor}`}
                    defaultValue={list.vendorAmounts[group.vendor] ?? ""}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      void run(() =>
                        setVendorAmount(
                          list.weekId,
                          group.vendor,
                          raw === "" ? null : Number(raw),
                        ),
                      );
                    }}
                    className="ht-input w-20 py-1 text-right"
                  />
                  MAD
                </label>
              )}
            </div>
            <ul className="divide-y divide-[var(--ht-input-border)]">
              {group.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    aria-label={`Acheté : ${item.name}`}
                    onChange={(e) =>
                      void run(() =>
                        setShoppingItemChecked(
                          list.weekId,
                          item.id,
                          e.target.checked,
                        ),
                      )
                    }
                  />
                  <span
                    dir="auto"
                    className={`flex-1 text-sm ${
                      item.checked
                        ? "text-[var(--ht-text-2)] line-through"
                        : "text-[var(--ht-text)]"
                    }`}
                  >
                    {item.name}
                    {item.quantity && (
                      <span className="text-[var(--ht-text-2)]">
                        {" "}
                        — {item.quantity}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    aria-label={`Supprimer ${item.name}`}
                    onClick={() =>
                      void run(() => removeShoppingItem(list.weekId, item.id))
                    }
                    className="text-[var(--ht-text-2)]"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {total > 0 && (
        <p className="text-right text-sm font-extrabold text-[var(--ht-text)]">
          Total payé : {formatMad(total)}
        </p>
      )}
    </div>
  );
}
