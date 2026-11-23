import { useEffect, useState } from "react";
import { emptyPlan } from "../domain/mealPlan";
import {
  subscribeToAllMealPlans,
  subscribeToDishes,
  subscribeToAllExpenses,
  subscribeToExpenses,
  subscribeToIngredients,
  subscribeToPantry,
  subscribeToMealPlan,
  subscribeToShoppingList,
} from "../services/meals";
import type {
  CatalogIngredient,
  Dish,
  HouseholdExpense,
  MealPlan,
  PantryItem,
  ShoppingList,
} from "../types";

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
    list: ready ? state : { weekId, items: {} },
    loading: !ready,
  };
}

/** Toutes les dépenses ; n'écoute la base que si enabled (onglet Dépenses ouvert). */
export function useAllExpenses(enabled: boolean): HouseholdExpense[] {
  const [expenses, setExpenses] = useState<HouseholdExpense[]>([]);
  useEffect(() => {
    if (!enabled) return;
    return subscribeToAllExpenses(setExpenses);
  }, [enabled]);
  return expenses;
}

export function useExpenses(weekId: string): {
  expenses: HouseholdExpense[];
  loading: boolean;
} {
  const [state, setState] = useState<{
    weekId: string;
    expenses: HouseholdExpense[];
  } | null>(null);

  useEffect(() => {
    return subscribeToExpenses(weekId, (expenses) =>
      setState({ weekId, expenses }),
    );
  }, [weekId]);

  const ready = state?.weekId === weekId;
  return { expenses: ready ? state.expenses : [], loading: !ready };
}

/** Toutes les semaines enregistrées (statistiques par plat). Vide tant que non chargé. */
export function useAllMealPlans(): MealPlan[] {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  useEffect(() => subscribeToAllMealPlans(setPlans), []);
  return plans;
}

/** Plats/snacks déjà saisis (autocomplétion). Vide tant que non chargé. */
export function useDishes(): Dish[] {
  const [dishes, setDishes] = useState<Dish[]>([]);
  useEffect(() => subscribeToDishes(setDishes), []);
  return dishes;
}

/** Ingrédients « en stock », exclus du contrôle des oublis. */
export function usePantry(): PantryItem[] {
  const [items, setItems] = useState<PantryItem[]>([]);
  useEffect(() => subscribeToPantry(setItems), []);
  return items;
}

/** Articles de courses déjà saisis, avec leur dernier point de vente/quantité. */
export function useIngredients(): CatalogIngredient[] {
  const [ingredients, setIngredients] = useState<CatalogIngredient[]>([]);
  useEffect(() => subscribeToIngredients(setIngredients), []);
  return ingredients;
}
