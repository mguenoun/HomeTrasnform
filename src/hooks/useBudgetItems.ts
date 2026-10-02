import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeToBudgetItems } from "../services/budgetItems";
import type { BudgetItem } from "../types";

export function useBudgetItems(): { items: BudgetItem[]; loading: boolean } {
  const { user } = useAuth();
  const uid = user?.uid;
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(true);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToBudgetItems(uid, (next) => {
      setItems(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { items, loading };
}
