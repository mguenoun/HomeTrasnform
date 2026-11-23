import { useState, type FormEvent } from "react";
import { catalogKey } from "../domain/catalog";
import {
  paidFor,
  sumItemPrices,
  toDateInputValue,
} from "../domain/expenses";
import {
  DEFAULT_VENDORS,
  buildVendorMessage,
  describeGroup,
  groupByVendor,
  whatsappUrl,
  type VendorGroup,
} from "../domain/mealPlan";
import { translationFor, type TranslationIndex } from "../domain/translations";
import { formatMad } from "../domain/money";
import {
  addShoppingItem,
  payVendorRound,
  removeShoppingItem,
  setShoppingItemChecked,
  setShoppingItemPrice,
  updateShoppingItem,
} from "../services/meals";
import type {
  CatalogIngredient,
  HouseholdExpense,
  ShoppingItem,
  ShoppingList,
} from "../types";
import { buildVendorTable } from "../domain/shareTable";
import { shareTableImage } from "../services/tableImage";
import { ShoppingImport } from "./ShoppingImport";
import { TranslationInput } from "./TranslationInput";

const groupKey = (group: { vendor: string; round: number }) =>
  `${group.vendor}\u0000${group.round}`;

interface ItemDraft {
  name: string;
  translation: string;
  initialTranslation?: string;
  quantity: string;
  vendor: string;
}

export function ShoppingListView({
  list,
  expenses,
  userId,
  ingredients = [],
  translations,
}: {
  list: ShoppingList;
  expenses: HouseholdExpense[];
  userId: string;
  ingredients?: CatalogIngredient[];
  translations?: TranslationIndex;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [vendor, setVendor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hideChecked, setHideChecked] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  // Passage dont le paiement est en cours de saisie ("Payer ici").
  const [paying, setPaying] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [paidMessage, setPaidMessage] = useState<string | null>(null);
  // Article en cours de correction/traduction.
  const [editing, setEditing] = useState<{ id: string; draft: ItemDraft } | null>(
    null,
  );

  const items = Object.values(list.items);
  const groups = groupByVendor(items);
  const bought = items.filter((i) => i.checked).length;
  const remaining = items.length - bought;
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

  function startEdit(item: ShoppingItem) {
    setEditing({
      id: item.id,
      draft: {
        name: item.name,
        // Traduction déjà connue pour ce nom (catalogue, autre article, autre semaine).
        translation: translationFor(translations, item.name) ?? item.translation ?? "",
        initialTranslation:
          translationFor(translations, item.name) ?? item.translation ?? "",
        quantity: item.quantity ?? "",
        vendor: item.vendor ?? "",
      },
    });
  }

  async function saveEdit(event: FormEvent, item: ShoppingItem) {
    event.preventDefault();
    if (!editing) return;
    setError(null);
    try {
      await updateShoppingItem(list.weekId, item, editing.draft);
      setEditing(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'enregistrement.",
      );
    }
  }

  function startPayment(group: VendorGroup) {
    const detail = sumItemPrices(group.items);
    setPaying(groupKey(group));
    setPayAmount(detail > 0 ? String(detail) : "");
    setPayNote("");
    setPaidMessage(null);
  }

  async function confirmPayment(group: VendorGroup) {
    setError(null);
    const leftover = group.items.filter((i) => !i.checked);
    try {
      await payVendorRound(list.weekId, {
        vendor: group.vendor,
        round: group.round,
        amount: Number(payAmount),
        date: toDateInputValue(new Date()),
        note: payNote,
        createdBy: userId,
        leftoverItemIds: leftover.map((i) => i.id),
      });
      setPaidMessage(
        leftover.length > 0
          ? `Paiement enregistré chez ${group.vendor}. ${leftover.length} article${leftover.length > 1 ? "s" : ""} non pris reporté${leftover.length > 1 ? "s" : ""} vers « ${describeGroup(group.vendor, group.round + 1)} ».`
          : `Paiement enregistré chez ${group.vendor}.`,
      );
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
      {tableError && (
        <p role="alert" className="text-sm text-[var(--ht-danger)]">
          {tableError}
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
          const key = groupKey(group);
          const title = describeGroup(group.vendor, group.round);
          const paid = paidFor(expenses, group.vendor, group.round);
          const detail = sumItemPrices(group.items);
          const groupBought = group.items.filter((i) => i.checked).length;
          // Tout est pris et déjà payé : rien à proposer (un paiement de plus serait une erreur).
          const settled = paid.payments > 0 && groupBought === group.items.length;
          const visible = hideChecked
            ? group.items.filter((i) => !i.checked)
            : group.items;
          return (
            <section key={key} className="ht-card">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 pt-3">
                <h3 className="text-sm font-extrabold text-[var(--ht-text)]">
                  {title}{" "}
                  <span className="font-normal text-[var(--ht-text-2)]">
                    {groupBought}/{group.items.length} pris
                    {groupBought === group.items.length && " ✓"}
                  </span>
                </h3>
                {group.vendor && groupBought < group.items.length && (
                  <span className="flex flex-wrap gap-1.5">
                    <a
                      href={whatsappUrl(buildVendorMessage(group, translations))}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Envoyer à ${title} sur WhatsApp`}
                      className="ht-btn px-2.5 py-1 text-xs"
                    >
                      Envoyer sur WhatsApp
                    </a>
                    <button
                      type="button"
                      aria-label={`Envoyer à ${title} en tableau (image)`}
                      onClick={() => {
                        setTableError(null);
                        shareTableImage(
                          buildVendorTable(group, translations),
                          `courses-${catalogKey(title)}.png`,
                        ).catch((err: unknown) =>
                          setTableError(
                            err instanceof Error ? err.message : "Impossible de créer l'image.",
                          ),
                        );
                      }}
                      className="ht-btn px-2.5 py-1 text-xs"
                    >
                      Tableau (image)
                    </button>
                  </span>
                )}
                <p className="text-xs text-[var(--ht-text-2)]">
                  {paid.payments > 0
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
                  {visible.map((item) =>
                    editing?.id === item.id ? (
                      <li key={item.id} className="px-4 py-2.5">
                        <form
                          onSubmit={(e) => void saveEdit(e, item)}
                          className="flex flex-col gap-2"
                        >
                          <input
                            value={editing.draft.name}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                draft: { ...editing.draft, name: e.target.value },
                              })
                            }
                            aria-label="Nom de l'article"
                            dir="auto"
                            className="ht-input"
                          />
                          <TranslationInput
                            value={editing.draft.translation}
                            onChange={(translation) =>
                              setEditing({
                                ...editing,
                                draft: { ...editing.draft, translation },
                              })
                            }
                            source={editing.draft.name}
                            known={translationFor(translations, editing.draft.name)}
                          />
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              value={editing.draft.quantity}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  draft: {
                                    ...editing.draft,
                                    quantity: e.target.value,
                                  },
                                })
                              }
                              placeholder="Quantité"
                              aria-label="Quantité de l'article"
                              dir="auto"
                              className="ht-input sm:w-40"
                            />
                            <input
                              value={editing.draft.vendor}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  draft: {
                                    ...editing.draft,
                                    vendor: e.target.value,
                                  },
                                })
                              }
                              placeholder="Point de vente"
                              aria-label="Point de vente de l'article"
                              list="meal-vendors"
                              className="ht-input sm:w-40"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" className="ht-btn-cta-sm">
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="ht-btn px-3 py-1.5 text-sm"
                            >
                              Annuler
                            </button>
                          </div>
                        </form>
                      </li>
                    ) : (
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
                          className={`min-w-0 flex-1 break-words text-sm ${
                            item.checked
                              ? "text-[var(--ht-text-2)] line-through"
                              : "text-[var(--ht-text)]"
                          }`}
                        >
                          {item.name}
                          {(translationFor(translations, item.name) ?? item.translation) && (
                            <span className="block text-xs text-[var(--ht-text-2)]">
                              {translationFor(translations, item.name) ?? item.translation}
                            </span>
                          )}
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
                          aria-label={`Modifier ${item.name}`}
                          onClick={() => startEdit(item)}
                          className="text-[var(--ht-text-2)]"
                        >
                          ✎
                        </button>
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
                    ),
                  )}
                </ul>
              )}

              {group.vendor && !settled && (
                <div className="border-t border-[var(--ht-input-border)] px-4 py-2.5">
                  {paying === key ? (
                    <div className="flex flex-col gap-2">
                      {groupBought < group.items.length && (
                        <p className="text-xs text-[var(--ht-text-2)]">
                          Les {group.items.length - groupBought} articles non pris
                          iront dans « {describeGroup(group.vendor, group.round + 1)} »
                          pour garder les paiements séparés.
                        </p>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="Montant payé (MAD)"
                          aria-label={`Montant payé chez ${title}`}
                          className="ht-input sm:w-44"
                        />
                        <input
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                          placeholder="Note (facultatif)"
                          aria-label={`Note du paiement chez ${title}`}
                          dir="auto"
                          className="ht-input flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => void confirmPayment(group)}
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
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startPayment(group)}
                      className="ht-btn px-3 py-1.5 text-sm"
                    >
                      {paid.payments > 0
                        ? `Ajouter un paiement chez ${title}`
                        : groupBought < group.items.length
                          ? `Payer ${title} (il reste ${group.items.length - groupBought})`
                          : `Payer ${title}`}
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
