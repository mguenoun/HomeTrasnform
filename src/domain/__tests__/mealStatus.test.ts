import { describe, expect, it } from "vitest";
import type { MealPlan } from "../../types";
import {
  canEditStatus,
  countByStatus,
  filterPlan,
  itemStatus,
  markPlannedAsPrepared,
  matchesFilter,
  statusMarker,
  withStatus,
} from "../mealStatus";
import { snacksForDay } from "../mealPlan";

const plan = (): MealPlan => ({
  weekId: "2026-11-21",
  defaultDiners: 4,
  slots: {
    sat_lunch: {
      diners: 6,
      items: [
        { label: "Couscous", status: "prepared" },
        { label: "Salade" },
        { label: "Tarte", status: "skipped", skipReason: "Pas le temps" },
      ],
    },
    sun_dinner: { items: [{ label: "Shaaria", status: "skipped", skipReason: "Ingrédient manquant" }] },
    tue_snack: { items: [{ label: "Cake", status: "prepared" }] },
  },
});

describe("itemStatus / matchesFilter", () => {
  it("un élément sans statut est planifié", () => {
    expect(itemStatus({ label: "x" })).toBe("planned");
    expect(itemStatus({ label: "x", status: "prepared" })).toBe("prepared");
    expect(itemStatus({ label: "x", status: "skipped" })).toBe("skipped");
  });

  it("« Tout » accepte tout, les autres filtres un seul statut", () => {
    const item = { label: "x", status: "prepared" as const };
    expect(matchesFilter(item, "all")).toBe(true);
    expect(matchesFilter(item, "prepared")).toBe(true);
    expect(matchesFilter(item, "skipped")).toBe(false);
    expect(matchesFilter(item, "planned")).toBe(false);
  });
});

describe("countByStatus", () => {
  it("compte par statut, tous créneaux confondus", () => {
    expect(countByStatus(plan())).toEqual({ all: 5, planned: 1, prepared: 2, skipped: 2 });
  });

  it("renvoie zéro pour un programme vide", () => {
    expect(countByStatus({ weekId: "w", defaultDiners: 4, slots: {} })).toEqual({
      all: 0,
      planned: 0,
      prepared: 0,
      skipped: 0,
    });
  });
});

describe("filterPlan", () => {
  it("« Tout » renvoie le programme tel quel", () => {
    const p = plan();
    expect(filterPlan(p, "all")).toBe(p);
  });

  it("ne garde que les éléments du statut, et fait disparaître les créneaux vidés", () => {
    const filtered = filterPlan(plan(), "skipped");
    expect(Object.keys(filtered.slots).sort()).toEqual(["sat_lunch", "sun_dinner"]);
    expect(filtered.slots.sat_lunch.items.map((i) => i.label)).toEqual(["Tarte"]);
    expect(filtered.slots.sat_lunch.diners).toBe(6);
    expect(filtered.slots.tue_snack).toBeUndefined();
  });

  it("ne mute pas le programme d'origine", () => {
    const p = plan();
    filterPlan(p, "prepared");
    expect(p.slots.sat_lunch.items).toHaveLength(3);
  });

  it("le report des snacks se recalcule sur ce qui reste", () => {
    const p = plan();
    // filtre « préparé » : le cake préparé du mardi est reporté sur le mercredi
    expect(snacksForDay(filterPlan(p, "prepared"), "wed").items[0].label).toBe("Cake");
    // filtre « non préparé » : aucun snack, donc rien n'est reporté
    expect(snacksForDay(filterPlan(p, "skipped"), "wed").items).toEqual([]);
  });
});

describe("withStatus", () => {
  it("marque préparé en retirant tout motif", () => {
    expect(withStatus({ label: "x", status: "skipped", skipReason: "Pas le temps" }, "prepared")).toEqual({
      label: "x",
      status: "prepared",
    });
  });

  it("marque non préparé avec un motif rogné, ou sans motif", () => {
    expect(withStatus({ label: "x" }, "skipped", "  Pas le temps ")).toEqual({
      label: "x",
      status: "skipped",
      skipReason: "Pas le temps",
    });
    expect(withStatus({ label: "x" }, "skipped")).toEqual({ label: "x", status: "skipped" });
    expect(withStatus({ label: "x" }, "skipped", "   ")).toEqual({ label: "x", status: "skipped" });
  });

  it("revenir à planifié retire statut et motif, et garde le reste", () => {
    expect(
      withStatus({ label: "x", translation: "t", status: "skipped", skipReason: "r" }, "planned"),
    ).toEqual({ label: "x", translation: "t" });
  });

  it("ne mute pas l'élément d'origine", () => {
    const item = { label: "x", status: "prepared" as const };
    withStatus(item, "planned");
    expect(item.status).toBe("prepared");
  });
});

describe("markPlannedAsPrepared", () => {
  it("ne marque que les éléments encore planifiés", () => {
    const slot = markPlannedAsPrepared(plan().slots.sat_lunch);
    expect(slot.items).toEqual([
      { label: "Couscous", status: "prepared" },
      { label: "Salade", status: "prepared" },
      { label: "Tarte", status: "skipped", skipReason: "Pas le temps" },
    ]);
    expect(slot.diners).toBe(6);
  });
});

describe("statusMarker", () => {
  it("✅ préparé, ❌ non préparé, rien si planifié", () => {
    expect(statusMarker({ label: "x", status: "prepared" })).toBe("✅ ");
    expect(statusMarker({ label: "x", status: "skipped" })).toBe("❌ ");
    expect(statusMarker({ label: "x" })).toBe("");
  });
});

describe("canEditStatus", () => {
  it("autorise tout le monde quand aucune liste n'est définie", () => {
    expect(canEditStatus("a@x.com", undefined)).toBe(true);
    expect(canEditStatus(null, "")).toBe(true);
    expect(canEditStatus("a@x.com", " , ")).toBe(true);
  });

  it("limite aux e-mails listés, sans tenir compte de la casse ni des espaces", () => {
    expect(canEditStatus("Chef@X.com", "autre@x.com, chef@x.com")).toBe(true);
    expect(canEditStatus("fille@x.com", "chef@x.com")).toBe(false);
  });

  it("refuse un compte sans e-mail quand une liste existe", () => {
    expect(canEditStatus(undefined, "chef@x.com")).toBe(false);
    expect(canEditStatus(null, "chef@x.com")).toBe(false);
  });
});
