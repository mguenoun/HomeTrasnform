import { describe, expect, it } from "vitest";
import {
  buildPlanMessage,
  buildShoppingMessage,
  daysOfWeek,
  dinersOf,
  emptyPlan,
  groupByVendor,
  shiftWeek,
  splitMealText,
  startOfWeekId,
  weekIdOf,
  whatsappUrl,
} from "../mealPlan";

describe("weekIdOf (semaine du samedi au vendredi)", () => {
  it("un samedi ouvre sa propre semaine", () => {
    expect(weekIdOf(new Date(2026, 10, 21))).toBe("2026-11-21");
  });

  it("rattache les jours suivants, jusqu'au vendredi, au samedi précédent", () => {
    expect(weekIdOf(new Date(2026, 10, 22))).toBe("2026-11-21"); // dimanche
    expect(weekIdOf(new Date(2026, 10, 25))).toBe("2026-11-21"); // mercredi
    expect(weekIdOf(new Date(2026, 10, 27))).toBe("2026-11-21"); // vendredi
  });

  it("le samedi suivant ouvre la semaine suivante", () => {
    expect(weekIdOf(new Date(2026, 10, 28))).toBe("2026-11-28");
  });

  it("le vendredi précédent appartient à la semaine d'avant", () => {
    expect(weekIdOf(new Date(2026, 10, 20))).toBe("2026-11-14");
  });

  it("une semaine peut chevaucher deux années", () => {
    expect(weekIdOf(new Date(2027, 0, 1))).toBe("2026-12-26");
  });
});

describe("startOfWeekId / shiftWeek / daysOfWeek", () => {
  it("relit la date de début", () => {
    const start = startOfWeekId("2026-11-21");
    expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([
      2026, 10, 21,
    ]);
  });

  it("avance et recule d'une semaine, y compris à cheval sur l'année", () => {
    expect(shiftWeek("2026-11-21", 1)).toBe("2026-11-28");
    expect(shiftWeek("2026-12-26", 1)).toBe("2027-01-02");
    expect(shiftWeek("2027-01-02", -1)).toBe("2026-12-26");
  });

  it("traverse un changement d'heure sans décalage de jour", () => {
    expect(shiftWeek("2026-03-28", 1)).toBe("2026-04-04");
    expect(shiftWeek("2026-10-24", 1)).toBe("2026-10-31");
    expect(shiftWeek("2026-10-24", 2)).toBe("2026-11-07");
  });

  it("liste samedi → vendredi avec les bonnes clés de jour", () => {
    const days = daysOfWeek("2026-11-21");
    expect(days.map((d) => d.key)).toEqual([
      "sat",
      "sun",
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
    ]);
    expect(days[0].date.getDate()).toBe(21);
    expect(days[6].date.getDate()).toBe(27);
  });

  it("refuse un identifiant invalide", () => {
    expect(() => startOfWeekId("2026-W47")).toThrow();
  });
});

describe("dinersOf", () => {
  it("retombe sur la valeur par défaut de la semaine", () => {
    const plan = { ...emptyPlan("2026-11-21"), defaultDiners: 5 };
    expect(dinersOf(plan, undefined)).toBe(5);
    expect(dinersOf(plan, { items: [] })).toBe(5);
    expect(dinersOf(plan, { diners: 8, items: [] })).toBe(8);
  });
});

describe("splitMealText", () => {
  it("coupe un repas composé sur le +", () => {
    expect(splitMealText("كسكسو + سلاض فروي")).toEqual(["كسكسو", "سلاض فروي"]);
    expect(splitMealText("Couscous+ salade ")).toEqual(["Couscous", "salade"]);
  });

  it("garde un repas simple et ignore les éléments vides", () => {
    expect(splitMealText("Pizza")).toEqual(["Pizza"]);
    expect(splitMealText(" + ")).toEqual([]);
  });
});

describe("buildPlanMessage", () => {
  it("affiche les repas, avec traduction, et ignore les jours vides", () => {
    const plan = emptyPlan("2026-11-21");
    plan.slots.sat_lunch = {
      diners: 6,
      items: [
        { label: "كسكسو", translation: "Couscous" },
        { label: "Salade" },
      ],
    };
    const message = buildPlanMessage(plan);
    expect(message).toContain("Samedi 21 — السبت");
    expect(message).toContain("Déjeuner / الغداء (6) : كسكسو — Couscous, Salade");
    expect(message).not.toContain("Dimanche");
  });
});

describe("groupByVendor", () => {
  const item = (id: string, vendor: string | undefined, checked = false) => ({
    id,
    name: id,
    vendor,
    checked,
    createdAt: Number(id.charCodeAt(0)),
  });

  it("regroupe par point de vente, sans point de vente en dernier", () => {
    const groups = groupByVendor([
      item("a", undefined),
      item("b", "Boucher"),
      item("c", "Épicier"),
      item("d", "Boucher"),
    ]);
    expect(groups.map((g) => g.vendor)).toEqual(["Boucher", "Épicier", ""]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["b", "d"]);
  });

  it("met les articles non cochés avant les cochés", () => {
    const [group] = groupByVendor([
      item("a", "Boucher", true),
      item("b", "Boucher"),
    ]);
    expect(group.items.map((i) => i.id)).toEqual(["b", "a"]);
  });
});

describe("buildShoppingMessage", () => {
  it("liste par point de vente, avec quantité et traduction", () => {
    const message = buildShoppingMessage([
      {
        id: "a",
        name: "شعرية",
        translation: "Cheveux d'ange",
        quantity: "1 paquet",
        vendor: "Épicier",
        checked: false,
        createdAt: 1,
      },
      { id: "b", name: "Poulet", vendor: "Volailler", checked: true, createdAt: 2 },
    ]);
    const lines = message.split("\n");
    expect(lines).toContain("*Épicier*");
    expect(lines).toContain("▫️ شعرية — Cheveux d'ange (1 paquet)");
    expect(lines).toContain("*Volailler*");
    expect(lines).toContain("✅ Poulet");
  });
});

describe("whatsappUrl", () => {
  it("encode le message", () => {
    expect(whatsappUrl("a b\nc")).toBe("https://wa.me/?text=a%20b%0Ac");
  });
});
