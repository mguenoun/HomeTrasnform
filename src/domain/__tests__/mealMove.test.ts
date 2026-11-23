import { describe, expect, it } from "vitest";
import type { MealPlan } from "../../types";
import { moveItem } from "../mealMove";

const plan: MealPlan = {
  weekId: "2026-11-21",
  defaultDiners: 4,
  slots: {
    sat_lunch: {
      diners: 6,
      items: [
        { label: "Couscous", status: "prepared", votes: { u1: "up" } },
        { label: "Salade" },
      ],
    },
    sun_dinner: { items: [{ label: "Tajine" }] },
  },
};

describe("moveItem", () => {
  it("déplace le plat avec tout ce qu'il porte, sans toucher aux convives", () => {
    const moved = moveItem(plan, "sat_lunch", 0, "sun_dinner")!;
    expect(moved.from).toEqual({ diners: 6, items: [{ label: "Salade" }] });
    expect(moved.to.items).toEqual([
      { label: "Tajine" },
      { label: "Couscous", status: "prepared", votes: { u1: "up" } },
    ]);
  });

  it("crée le créneau d'arrivée s'il n'existe pas", () => {
    const moved = moveItem(plan, "sat_lunch", 1, "mon_lunch")!;
    expect(moved.to).toEqual({ items: [{ label: "Salade" }] });
  });

  it("vide le créneau d'origine quand son dernier plat part", () => {
    expect(moveItem(plan, "sun_dinner", 0, "sat_lunch")!.from.items).toEqual([]);
  });

  it("ne fait rien dans le même créneau, ni pour un plat qui n'existe pas", () => {
    expect(moveItem(plan, "sat_lunch", 0, "sat_lunch")).toBeNull();
    expect(moveItem(plan, "sat_lunch", 9, "sun_dinner")).toBeNull();
    expect(moveItem(plan, "fri_lunch", 0, "sun_dinner")).toBeNull();
  });

  it("ne mute pas le plan d'origine", () => {
    moveItem(plan, "sat_lunch", 0, "sun_dinner");
    expect(plan.slots.sat_lunch.items).toHaveLength(2);
  });
});
