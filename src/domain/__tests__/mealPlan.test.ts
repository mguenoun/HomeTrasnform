import { describe, expect, it } from "vitest";
import {
  buildPlanMessage,
  buildShoppingMessage,
  datesOfWeek,
  dinersOf,
  emptyPlan,
  mondayOfWeekId,
  shiftWeek,
  weekIdOf,
  whatsappUrl,
} from "../mealPlan";

describe("weekIdOf", () => {
  it("donne la semaine ISO d'une date en milieu d'année", () => {
    expect(weekIdOf(new Date(2026, 10, 21))).toBe("2026-W47"); // samedi
    expect(weekIdOf(new Date(2026, 10, 23))).toBe("2026-W48"); // lundi suivant
  });

  it("rattache le dimanche à la semaine qui finit", () => {
    expect(weekIdOf(new Date(2026, 10, 22))).toBe("2026-W47");
  });

  it("gère les années à 53 semaines : 1er janvier 2027 = 2026-W53", () => {
    expect(weekIdOf(new Date(2027, 0, 1))).toBe("2026-W53");
    expect(weekIdOf(new Date(2027, 0, 4))).toBe("2027-W01");
  });

  it("rattache la fin décembre à la semaine 1 de l'année suivante", () => {
    expect(weekIdOf(new Date(2024, 11, 30))).toBe("2025-W01");
  });
});

describe("mondayOfWeekId / shiftWeek / datesOfWeek", () => {
  it("retrouve le lundi de la semaine", () => {
    const monday = mondayOfWeekId("2026-W47");
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate()]).toEqual(
      [2026, 10, 16],
    );
  });

  it("avance et recule d'une semaine, y compris à cheval sur l'année", () => {
    expect(shiftWeek("2026-W47", 1)).toBe("2026-W48");
    expect(shiftWeek("2026-W53", 1)).toBe("2027-W01");
    expect(shiftWeek("2027-W01", -1)).toBe("2026-W53");
  });

  it("liste 7 dates consécutives du lundi au dimanche", () => {
    const dates = datesOfWeek("2026-W47");
    expect(dates).toHaveLength(7);
    expect(dates[0].getDate()).toBe(16);
    expect(dates[6].getDate()).toBe(22);
  });

  it("refuse un identifiant invalide", () => {
    expect(() => mondayOfWeekId("2026-47")).toThrow();
  });
});

describe("dinersOf", () => {
  it("retombe sur la valeur par défaut de la semaine", () => {
    const plan = { ...emptyPlan("2026-W47"), defaultDiners: 5 };
    expect(dinersOf(plan, undefined)).toBe(5);
    expect(dinersOf(plan, { items: [] })).toBe(5);
    expect(dinersOf(plan, { diners: 8, items: [] })).toBe(8);
  });
});

describe("buildPlanMessage", () => {
  it("affiche les repas en français + darija et ignore les jours vides", () => {
    const plan = emptyPlan("2026-W47");
    plan.slots.mon_lunch = {
      diners: 6,
      items: [
        { label: "Tajine poulet", labelAr: "طاجين الدجاج" },
        { label: "Salade" },
      ],
    };
    const message = buildPlanMessage(plan);
    expect(message).toContain("Lundi 16 — الاثنين");
    expect(message).toContain(
      "Déjeuner / الغدا (6) : Tajine poulet — طاجين الدجاج, Salade",
    );
    expect(message).not.toContain("Mardi");
  });
});

describe("buildShoppingMessage", () => {
  it("met les articles non cochés avant les cochés, avec quantité", () => {
    const message = buildShoppingMessage([
      { id: "a", name: "Lait", checked: true, createdAt: 1 },
      {
        id: "b",
        name: "Tomates",
        nameAr: "طماطم",
        quantity: "2 kg",
        checked: false,
        createdAt: 2,
      },
    ]);
    const lines = message.split("\n");
    expect(lines[2]).toBe("▫️ Tomates — طماطم (2 kg)");
    expect(lines[3]).toBe("✅ Lait");
  });
});

describe("whatsappUrl", () => {
  it("encode le message", () => {
    expect(whatsappUrl("a b\nc")).toBe("https://wa.me/?text=a%20b%0Ac");
  });
});
