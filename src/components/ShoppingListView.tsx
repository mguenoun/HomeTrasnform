import { useState, type FormEvent } from "react";
import {
  addShoppingItem,
  removeShoppingItem,
  setShoppingItemChecked,
} from "../services/meals";
import type { ShoppingList } from "../types";

export function ShoppingListView({ list }: { list: ShoppingList }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const items = Object.values(list.items).sort(
    (a, b) => Number(a.checked) - Number(b.checked) || a.createdAt - b.createdAt,
  );

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
    const input = { name, quantity };
    setName("");
    setQuantity("");
    void run(() => addShoppingItem(list.weekId, input));
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleAdd} className="ht-card flex flex-col gap-2 p-4 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Article (ex. tomates)"
          aria-label="Article"
          className="ht-input flex-1"
        />
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantité (ex. 2 kg)"
          aria-label="Quantité"
          className="ht-input sm:w-40"
        />
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
        <ul className="ht-card divide-y divide-[var(--ht-input-border)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                checked={item.checked}
                aria-label={`Acheté : ${item.name}`}
                onChange={(e) =>
                  void run(() =>
                    setShoppingItemChecked(list.weekId, item.id, e.target.checked),
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
                  <span className="text-[var(--ht-text-2)]"> — {item.quantity}</span>
                )}
              </span>
              <button
                type="button"
                aria-label={`Supprimer ${item.name}`}
                onClick={() => void run(() => removeShoppingItem(list.weekId, item.id))}
                className="text-[var(--ht-text-2)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
