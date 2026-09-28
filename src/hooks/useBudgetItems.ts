import { useEffect, useState } from "react";
import { subscribeToBudgetItems } from "../services/budgetItems";
import type { BudgetItem } from "../types";

export function useBudgetItems(): { items: BudgetItem[]; loading: boolean } {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToBudgetItems((next) => {
      setItems(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { items, loading };
}
