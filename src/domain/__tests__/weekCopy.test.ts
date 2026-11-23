import { describe, expect, it } from "vitest";
import type { MealPlan } from "../../types";
import { parseProgramText } from "../mealImport";
import { copyPreviousWeek, mergeImportedSlots } from "../weekCopy";

const previous: MealPlan = {
  weekId: "2026-11-14",
  defaultDiners: 4,
  slots: {
    sat_lunch: {
      diners: 6,
      items: [
        { label: "Couscous", status: "prepared", votes: { u1: "up" }, feedbackNote: "bon" },
        { label: "Salade", translation: "سلطة" },
      ],
    },
    sat_snack: { items: [{ label: "Pizzas", n: 10, status: "skipped", skipReason: "Pas le temps" }] },
    sun_dinner: { items: [{ label: "Tajine" }] },
    mon_lunch: { items: [] },
  },
};

const empty: MealPlan = { weekId: "2026-11-21", defaultDiners: 4, slots: {} };

describe("copyPreviousWeek", () => {
  it("recopie les plats, convives, traductions et quantités, sans statut ni votes", () => {
    const { slots, copied, skipped } = copyPreviousWeek(previous, empty);
    expect(copied).toBe(3);
    expect(skipped).toBe(0);
    expect(slots.sat_lunch).toEqual({
      diners: 6,
      items: [{ label: "Couscous" }, { label: "Salade", translation: "سلطة" }],
    });
    expect(slots.sat_snack).toEqual({ items: [{ label: "Pizzas", n: 10 }] });
    expect(slots.sun_dinner).toEqual({ items: [{ label: "Tajine" }] });
  });

  it("ne touche jamais à un créneau déjà rempli cette semaine", () => {
    const current: MealPlan = {
      ...empty,
      slots: { sat_lunch: { items: [{ label: "Pâtes" }] } },
    };
    const { slots, copied, skipped } = copyPreviousWeek(previous, current);
    expect(slots.sat_lunch).toBeUndefined();
    expect(copied).toBe(2);
    expect(skipped).toBe(1);
  });

  it("ignore les créneaux vides et ne mute rien", () => {
    const { slots } = copyPreviousWeek(previous, empty);
    expect(slots.mon_lunch).toBeUndefined();
    expect(previous.slots.sat_lunch.items[0].status).toBe("prepared");
  });

  it("recopier une semaine vide ne fait rien", () => {
    expect(copyPreviousWeek(empty, empty).copied).toBe(0);
  });
});

describe("mergeImportedSlots", () => {
  const current: MealPlan = {
    weekId: "2026-11-21",
    defaultDiners: 4,
    slots: {
      sat_lunch: {
        items: [
          { label: "Couscous", status: "prepared", votes: { u1: "up" } },
          { label: "Tarte", status: "skipped" },
        ],
      },
    },
  };

  it("conserve un plat déjà en place avec son statut et ses votes", () => {
    const merged = mergeImportedSlots(current, {
      sat_lunch: [{ label: "كسكسو" }, { label: "couscous" }],
    });
    expect(merged.slots.sat_lunch[1]).toBe(current.slots.sat_lunch.items[0]);
    expect(merged.kept).toBe(1);
  });

  it("compte ce qui disparaît, dont les plats déjà marqués", () => {
    const merged = mergeImportedSlots(current, { sat_lunch: [{ label: "Couscous" }] });
    expect(merged.removed).toBe(1);
    expect(merged.removedWithStatus).toBe(1);
    expect(merged.replaced).toBe(1);
  });

  it("ajouter des plats n'enlève rien : pas de confirmation à demander", () => {
    const merged = mergeImportedSlots(current, {
      sat_lunch: [{ label: "Couscous" }, { label: "Tarte" }, { label: "Salade" }],
    });
    expect(merged.removed).toBe(0);
    expect(merged.replaced).toBe(0);
    expect(merged.kept).toBe(2);
  });

  it("un créneau jusque-là vide s'importe sans rien perdre", () => {
    const merged = mergeImportedSlots(current, { sun_dinner: [{ label: "Tajine" }] });
    expect(merged.removed).toBe(0);
    expect(merged.slots.sun_dinner).toEqual([{ label: "Tajine" }]);
  });

  it("n'apparie pas deux fois le même plat existant", () => {
    const merged = mergeImportedSlots(current, {
      sat_lunch: [{ label: "Couscous" }, { label: "Couscous" }],
    });
    expect(merged.kept).toBe(1);
    expect(merged.slots.sat_lunch[1]).toEqual({ label: "Couscous" });
  });
});

describe("parseProgramText — jours saisis avec une date", () => {
  it("reconnaît « السبت 21 » et « Samedi 21/11 »", () => {
    const parsed = parseProgramText("السبت 21 : a | b | c\nDimanche 22/11 : d | e | f");
    expect(parsed.ignored).toEqual([]);
    expect(Object.keys(parsed.slots)).toContain("sat_lunch");
    expect(Object.keys(parsed.slots)).toContain("sun_dinner");
  });

  it("continue d'ignorer une ligne qui n'est pas un jour", () => {
    expect(parseProgramText("Courses : lait").ignored).toEqual(["Courses : lait"]);
  });
});
