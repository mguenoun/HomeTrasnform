import { useEffect, useState } from "react";
import { emptyPlan } from "../domain/mealPlan";
import {
  subscribeToMealPlan,
  subscribeToShoppingList,
} from "../services/meals";
import type { MealPlan, ShoppingList } from "../types";

/** Programme de la semaine ; un plan vide (non encore enregistré) si absent. */
export function useMealPlan(weekId: string): {
  plan: MealPlan;
  loading: boolean;
} {
  const [state, setState] = useState<{ weekId: string; plan: MealPlan } | null>(
    null,
  );

  useEffect(() => {
    return subscribeToMealPlan(weekId, (next) => {
      setState({ weekId, plan: next ?? emptyPlan(weekId) });
    });
  }, [weekId]);

  // Tant que l'abonnement de la nouvelle semaine n'a rien renvoyé, on ne
  // montre pas le plan de la semaine précédente.
  const ready = state?.weekId === weekId;
  return {
    plan: ready ? state.plan : emptyPlan(weekId),
    loading: !ready,
  };
}

export function useShoppingList(weekId: string): {
  list: ShoppingList;
  loading: boolean;
} {
  const [state, setState] = useState<ShoppingList | null>(null);

  useEffect(() => {
    return subscribeToShoppingList(weekId, setState);
  }, [weekId]);

  const ready = state?.weekId === weekId;
  return {
    list: ready ? state : { weekId, items: {}, vendorAmounts: {} },
    loading: !ready,
  };
}
