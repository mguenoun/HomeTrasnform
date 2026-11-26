import { describe, expect, it } from "vitest";
import type { MealPlan } from "../../types";
import { generateProgram, type PickedDish } from "../programGenerator";

const empty: MealPlan = { weekId: "2026-11-21", defaultDiners: 4, slots: {} };

function dishes(n: number, type: PickedDish["type"], prefix: string): PickedDish[] {
  return Array.from({ length: n }, (_, i) => ({ label: `${prefix}${i + 1}`, type }));
}

function labelsOf(slots: Record<string, { items: Array<{ label: string }> }>): string[] {
  return Object.values(slots).flatMap((s) => s.items.map((i) => i.label));
}

describe("generateProgram", () => {
  it("place chaque plat au repas où il se sert d'habitude", () => {
    const { slots, misplaced, unplaced } = generateProgram({
      plan: empty,
      meals: [...dishes(7, "lunch", "L"), ...dishes(7, "dinner", "D")],
      snacks: [],
      seed: 1,
    });
    expect(Object.keys(slots)).toHaveLength(14);
    for (const [key, slot] of Object.entries(slots)) {
      const label = slot.items[0].label;
      expect(label.startsWith("L")).toBe(key.endsWith("_lunch"));
    }
    expect(misplaced).toEqual([]);
    expect(unplaced).toEqual([]);
  });

  it("met chaque plat une seule fois, un plat par créneau", () => {
    const { slots } = generateProgram({
      plan: empty,
      meals: dishes(14, "both", "P"),
      snacks: [],
      seed: 7,
    });
    const labels = labelsOf(slots);
    expect(new Set(labels).size).toBe(14);
    expect(Object.values(slots).every((s) => s.items.length === 1)).toBe(true);
  });

  it("une même graine donne la même répartition, une autre graine une autre", () => {
    const meals = dishes(14, "both", "P");
    const a = generateProgram({ plan: empty, meals, snacks: [], seed: 3 });
    const b = generateProgram({ plan: empty, meals, snacks: [], seed: 3 });
    const c = generateProgram({ plan: empty, meals, snacks: [], seed: 4 });
    expect(a).toEqual(b);
    expect(a.slots).not.toEqual(c.slots);
  });

  it("n'utilise jamais un créneau déjà rempli", () => {
    const plan: MealPlan = {
      ...empty,
      slots: {
        sat_lunch: { items: [{ label: "Pâtes" }] },
        sun_dinner: { items: [{ label: "Riz" }] },
      },
    };
    const { slots, unplaced } = generateProgram({
      plan,
      meals: dishes(14, "both", "P"),
      snacks: [],
      seed: 2,
    });
    expect(slots.sat_lunch).toBeUndefined();
    expect(slots.sun_dinner).toBeUndefined();
    expect(Object.keys(slots)).toHaveLength(12);
    expect(unplaced).toHaveLength(2);
  });

  it("répartit sur la semaine quand il y a moins de plats que de repas", () => {
    const { slots } = generateProgram({
      plan: empty,
      meals: dishes(4, "dinner", "D"),
      snacks: [],
      seed: 1,
    });
    const days = Object.keys(slots).map((k) => k.split("_")[0]);
    expect(Object.keys(slots)).toHaveLength(4);
    expect(new Set(days).size).toBe(4);
  });

  it("signale un plat servi à l'autre repas quand il n'y a plus de place au bon", () => {
    const { slots, misplaced } = generateProgram({
      plan: empty,
      meals: [...dishes(9, "lunch", "L"), ...dishes(5, "dinner", "D")],
      snacks: [],
      seed: 1,
    });
    expect(Object.keys(slots)).toHaveLength(14);
    expect(misplaced).toHaveLength(2);
    expect(misplaced.every((label) => label.startsWith("L"))).toBe(true);
  });

  it("les plats « les deux » comblent ce qui reste", () => {
    const { slots, misplaced } = generateProgram({
      plan: empty,
      meals: [...dishes(7, "lunch", "L"), ...dishes(7, "both", "B")],
      snacks: [],
      seed: 5,
    });
    expect(Object.keys(slots)).toHaveLength(14);
    expect(misplaced).toEqual([]);
    for (const [key, slot] of Object.entries(slots)) {
      if (slot.items[0].label.startsWith("L")) expect(key.endsWith("_lunch")).toBe(true);
    }
  });

  it("espace les snacks sur la semaine, sans écraser un snack déjà saisi", () => {
    const plan: MealPlan = { ...empty, slots: { sat_snack: { items: [{ label: "Cake" }] } } };
    const { slots, unplacedSnacks } = generateProgram({
      plan,
      meals: [],
      snacks: [{ label: "Pizzas" }, { label: "Msemen" }, { label: "Gâteau" }],
      seed: 1,
    });
    const keys = Object.keys(slots);
    expect(keys).toHaveLength(3);
    expect(keys.every((k) => k.endsWith("_snack") && k !== "sat_snack")).toBe(true);
    expect(unplacedSnacks).toEqual([]);
  });

  it("garde le plus possible de snacks sans jour libre dans unplacedSnacks", () => {
    const snacks = Array.from({ length: 9 }, (_, i) => ({ label: `S${i + 1}` }));
    const { slots, unplacedSnacks } = generateProgram({ plan: empty, meals: [], snacks, seed: 1 });
    expect(Object.keys(slots)).toHaveLength(7);
    expect(unplacedSnacks).toHaveLength(2);
  });

  it("emporte la traduction du plat choisi", () => {
    const { slots } = generateProgram({
      plan: empty,
      meals: [{ label: "كسكسو", translation: "Couscous", type: "lunch" }],
      snacks: [],
      seed: 1,
    });
    expect(Object.values(slots)[0].items[0]).toEqual({ label: "كسكسو", translation: "Couscous" });
  });

  it("ne mute pas le programme existant", () => {
    const plan: MealPlan = { ...empty, slots: { sat_lunch: { items: [{ label: "Pâtes" }] } } };
    generateProgram({ plan, meals: dishes(5, "both", "P"), snacks: [], seed: 1 });
    expect(plan.slots).toEqual({ sat_lunch: { items: [{ label: "Pâtes" }] } });
  });
});

describe("generateProgram — catégories et jour préféré", () => {
  it("met un plat à jour préféré ce jour-là, au repas habituel (le couscous du vendredi midi)", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { slots, dayMissed } = generateProgram({
        plan: empty,
        meals: [
          { label: "Couscous", type: "lunch", preferredDay: "fri" },
          ...dishes(13, "both", "P"),
        ],
        snacks: [],
        seed,
      });
      expect(slots.fri_lunch.items[0].label).toBe("Couscous");
      expect(dayMissed).toEqual([]);
    }
  });

  it("si le jour préféré est déjà pris, place le plat ailleurs et le signale", () => {
    const plan: MealPlan = { ...empty, slots: { fri_lunch: { items: [{ label: "Pâtes" }] } } };
    const { slots, dayMissed } = generateProgram({
      plan,
      meals: [{ label: "Couscous", type: "lunch", preferredDay: "fri" }],
      snacks: [],
      seed: 1,
    });
    expect(slots.fri_lunch).toBeUndefined();
    expect(labelsOf(slots)).toContain("Couscous");
    expect(dayMissed).toEqual(["Couscous"]);
  });

  it("une entrée ou un dessert seuls ne remplissent jamais un repas vide", () => {
    const { slots, unplacedExtras } = generateProgram({
      plan: empty,
      meals: [{ label: "Salade", type: "both", course: "starter" }],
      snacks: [],
      seed: 1,
    });
    expect(slots).toEqual({});
    expect(unplacedExtras).toEqual(["Salade"]);
  });

  it("les 14 places ne comptent que les plats principaux ; entrées et desserts s'y ajoutent", () => {
    const { slots, unplaced } = generateProgram({
      plan: empty,
      meals: [
        ...dishes(14, "both", "P"),
        { label: "Salade", type: "both", course: "starter" },
        { label: "Fruits", type: "both", course: "dessert" },
      ],
      snacks: [],
      seed: 3,
    });
    expect(unplaced).toEqual([]);
    expect(Object.keys(slots)).toHaveLength(14);
    const withSalad = Object.values(slots).filter((s) => s.items.some((i) => i.label === "Salade"));
    expect(withSalad).toHaveLength(1);
    expect(withSalad[0].items[0].label.startsWith("P")).toBe(true);
  });

  it("complète un programme déjà saisi sans rien retirer, une entrée au plus par repas", () => {
    const plan: MealPlan = {
      ...empty,
      slots: {
        sat_lunch: { items: [{ label: "Couscous", status: "prepared" }] },
        sun_dinner: { items: [{ label: "Tajine" }, { label: "Salade marocaine" }] },
      },
    };
    const courseOf = (label: string) => (label === "Salade marocaine" ? "starter" : "main");
    const { slots, emptyOnly, unplacedExtras } = generateProgram({
      plan,
      meals: [
        { label: "Zaalouk", type: "both", course: "starter" },
        { label: "Taktouka", type: "both", course: "starter" },
      ],
      snacks: [],
      seed: 1,
      courseOf,
    });
    // sun_dinner a déjà une entrée : seul sat_lunch peut en recevoir une
    expect(Object.keys(slots)).toEqual(["sat_lunch"]);
    expect(slots.sat_lunch.items).toHaveLength(1);
    expect(emptyOnly).toEqual([]);
    expect(unplacedExtras).toHaveLength(1);
  });

  it("préfère pour un complément le repas qui lui correspond", () => {
    const plan: MealPlan = {
      ...empty,
      slots: {
        sat_lunch: { items: [{ label: "Couscous" }] },
        sat_dinner: { items: [{ label: "Soupe" }] },
      },
    };
    const { slots } = generateProgram({
      plan,
      meals: [{ label: "Harira", type: "dinner", course: "starter" }],
      snacks: [],
      seed: 1,
    });
    expect(slots.sat_dinner.items[0].label).toBe("Harira");
  });

  it("emptyOnly liste les créneaux vides qui reçoivent un plat principal ou un snack", () => {
    const plan: MealPlan = { ...empty, slots: { sat_lunch: { items: [{ label: "Couscous" }] } } };
    const { emptyOnly } = generateProgram({
      plan,
      meals: [{ label: "Soupe", type: "dinner" }, { label: "Salade", type: "both", course: "starter" }],
      snacks: [{ label: "Cake" }],
      seed: 1,
    });
    expect(emptyOnly).toContain("sat_dinner");
    expect(emptyOnly.some((k) => k.endsWith("_snack"))).toBe(true);
    expect(emptyOnly).not.toContain("sat_lunch");
  });
});
