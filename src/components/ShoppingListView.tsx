import { useState, type FormEvent } from "react";
import { catalogKey } from "../domain/catalog";
import {
  sumItemPrices,
  summarizeExpenses,
  toDateInputValue,
} from "../domain/expenses";
import { DEFAULT_VENDORS, groupByVendor } from "../domain/mealPlan";
import { formatMad } from "../domain/money";
import {
  addExpense,
  addShoppingItem,
  removeShoppingItem,
  setShoppingItemChecked,
  setShoppingItemPrice,
} from "../services/meals";
import type {
  CatalogIngredient,
  HouseholdExpense,
  ShoppingList,
} from "../types";
import { ShoppingImport } from "./ShoppingImport";

export function ShoppingListView({
  list,
  expenses,
  userId,
  ingredients = [],
}: {
  list: ShoppingList;
  expenses: HouseholdExpense[];
  userId: string;
  ingredients?: CatalogIngredient[];
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [vendor, setVendor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hideChecked, setHideChecked] = useState(false);
  // Point de vente dont le paiement est en cours de saisie ("Terminer ici").
  const [paying, setPaying] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [paidMessage, setPaidMessage] = useState<string | null>(null);

  const items = Object.values(list.items);
  const groups = groupByVendor(items);
  const bought = items.filter((i) => i.checked).length;
  const remaining = items.length - bought;
  const paidByVendor = new Map(
    summarizeExpenses(expenses).byVendor.map((v) => [v.vendor, v]),
  );
  const usedVendors = items.map((i) => i.vendor).filter((v): v is string => !!v);
  const knownVendors = [...new Set([...DEFAULT_VENDORS, ...usedVendors])];

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

  function handleNameChange(value: string) {
    setName(value);
    // Article déjà connu : on reprend son dernier point de vente et sa
    // dernière quantité, sans écraser ce qui est déjà saisi.
    const known = ingredients.find((i) => catalogKey(i.name) === catalogKey(value));
    if (known) {
      if (!vendor && known.vendor) setVendor(known.vendor);
      if (!quantity && known.quantity) setQuantity(known.quantity);
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

  function startPayment(group: { vendor: string; items: typeof items }) {
    const detail = sumItemPrices(group.items);
    setPaying(group.vendor);
    setPayAmount(detail > 0 ? String(detail) : "");
    setPayNote("");
    setPaidMessage(null);
  }

  async function confirmPayment(vendorName: string) {
    setError(null);
    try {
      await addExpense({
        type: "groceries",
        amount: Number(payAmount),
        date: toDateInputValue(new Date()),
        weekId: list.weekId,
        vendor: vendorName,
        note: payNote,
        createdBy: userId,
      });
      setPaidMessage(`Paiement enregistré chez ${vendorName}.`);
      setPaying(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'enregistrement.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <section className="ht-card flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-[var(--ht-text)]">
              {bought} acheté{bought > 1 ? "s" : ""} · {remaining} restant
              {remaining > 1 ? "s" : ""}
            </p>
            <label className="flex items-center gap-1.5 text-xs text-[var(--ht-text-2)]">
              <input
                type="checkbox"
                checked={hideChecked}
                onChange={(e) => setHideChecked(e.target.checked)}
              />
              Masquer ce qui est pris
            </label>
          </div>
          <div
            role="progressbar"
            aria-label="Avancement des courses"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={bought}
            className="ht-track"
          >
            <div
              className="ht-fill-grad h-full"
              style={{ width: `${(bought / items.length) * 100}%` }}
            />
          </div>
        </section>
      )}

      <ShoppingImport
        weekId={list.weekId}
        userId={userId}
        knownVendors={usedVendors}
      />

      <form
        onSubmit={handleAdd}
        className="ht-card flex flex-col gap-2 p-4 sm:flex-row"
      >
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Article (ex. شعرية)"
          aria-label="Article"
          list="meal-ingredients"
          dir="auto"
          className="ht-input flex-1"
        />
        <datalist id="meal-ingredients">
          {ingredients.map((i) => (
            <option key={i.id} value={i.name} />
          ))}
        </datalist>
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
      {paidMessage && (
        <p role="status" className="text-sm text-[var(--ht-text)]">
          {paidMessage}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-[var(--ht-text-2)]">
          Aucun article pour cette semaine.
        </p>
      ) : (
        groups.map((group) => {
          const paid = paidByVendor.get(group.vendor);
          const detail = sumItemPrices(group.items);
          const groupBought = group.items.filter((i) => i.checked).length;
          const visible = hideChecked
            ? group.items.filter((i) => !i.checked)
            : group.items;
          return (
            <section key={group.vendor || "__none"} className="ht-card">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 pt-3">
                <h3 className="text-sm font-extrabold text-[var(--ht-text)]">
                  {group.vendor || "Sans point de vente"}{" "}
                  <span className="font-normal text-[var(--ht-text-2)]">
                    {groupBought}/{group.items.length} pris
                    {groupBought === group.items.length && " ✓"}
                  </span>
                </h3>
                <p className="text-xs text-[var(--ht-text-2)]">
                  {paid
                    ? `Payé ${formatMad(paid.total)}${paid.payments > 1 ? ` (${paid.payments} paiements)` : ""}`
                    : "Pas encore payé"}
                  {detail > 0 && ` · détail articles ${formatMad(detail)}`}
                </p>
              </div>

              {visible.length === 0 ? (
                <p className="px-4 py-2.5 text-sm text-[var(--ht-text-2)]">
                  Tout est pris.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--ht-input-border)]">
                  {visible.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
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
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        placeholder="Prix"
                        aria-label={`Prix, ${item.name}`}
                        defaultValue={item.price ?? ""}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const next = raw === "" ? null : Number(raw);
                          if (next === (item.price ?? null)) return;
                          void run(() =>
                            setShoppingItemPrice(list.weekId, item.id, next),
                          );
                        }}
                        className="ht-input w-16 py-0.5 text-right text-xs"
                      />
                      <button
                        type="button"
                        aria-label={`Supprimer ${item.name}`}
                        onClick={() =>
                          void run(() =>
                            removeShoppingItem(list.weekId, item.id),
                          )
                        }
                        className="text-[var(--ht-text-2)]"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {group.vendor && (
                <div className="border-t border-[var(--ht-input-border)] px-4 py-2.5">
                  {paying === group.vendor ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="Montant payé (MAD)"
                        aria-label={`Montant payé chez ${group.vendor}`}
                        className="ht-input sm:w-44"
                      />
                      <input
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                        placeholder="Note (facultatif)"
                        aria-label={`Note du paiement chez ${group.vendor}`}
                        dir="auto"
                        className="ht-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => void confirmPayment(group.vendor)}
                        className="ht-btn-cta-sm"
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaying(null)}
                        className="ht-btn px-3 py-1.5 text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startPayment(group)}
                      className="ht-btn px-3 py-1.5 text-sm"
                    >
                      {groupBought < group.items.length
                        ? `Payer ${group.vendor} (il reste ${group.items.length - groupBought})`
                        : `Payer ${group.vendor}`}
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
