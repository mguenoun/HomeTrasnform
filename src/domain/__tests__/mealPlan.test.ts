import { describe, expect, it } from "vitest";
import {
  buildPlanMessage,
  buildShoppingMessage,
  daysOfWeek,
  dinersOf,
  emptyPlan,
  describeGroup,
  groupByVendor,
  roundOf,
  shiftWeek,
  snacksForDay,
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

describe("snacksForDay (report des snacks sur les jours vides)", () => {
  const plan = () => {
    const p = emptyPlan("2026-11-21");
    p.slots.sat_snack = { items: [{ label: "Cheesecake" }] };
    p.slots.tue_snack = { items: [{ label: "Cake citron" }, { label: "Cake salé" }] };
    p.slots.thu_snack = { items: [{ label: "Baghrir" }] };
    return p;
  };

  it("un jour qui a ses snacks garde les siens", () => {
    const result = snacksForDay(plan(), "tue");
    expect(result.items.map((i) => i.label)).toEqual(["Cake citron", "Cake salé"]);
    expect(result.inheritedFrom).toBeUndefined();
  });

  it("un jour vide reprend le premier jour non vide qui précède (mer. ← mar.)", () => {
    const result = snacksForDay(plan(), "wed");
    expect(result.items.map((i) => i.label)).toEqual(["Cake citron", "Cake salé"]);
    expect(result.inheritedFrom?.key).toBe("tue");
  });

  it("dimanche et lundi reprennent samedi ; vendredi reprend jeudi", () => {
    expect(snacksForDay(plan(), "sun").inheritedFrom?.key).toBe("sat");
    expect(snacksForDay(plan(), "mon").inheritedFrom?.key).toBe("sat");
    expect(snacksForDay(plan(), "fri").items[0].label).toBe("Baghrir");
    expect(snacksForDay(plan(), "fri").inheritedFrom?.key).toBe("thu");
  });

  it("ne remonte jamais avant le début de la semaine (samedi vide reste vide)", () => {
    const p = emptyPlan("2026-11-21");
    p.slots.tue_snack = { items: [{ label: "Cake" }] };
    expect(snacksForDay(p, "sat").items).toEqual([]);
    expect(snacksForDay(p, "mon").items).toEqual([]);
  });

  it("saisir un snack le jour même remplace le report", () => {
    const p = plan();
    p.slots.wed_snack = { items: [{ label: "Crêpes" }] };
    expect(snacksForDay(p, "wed").items[0].label).toBe("Crêpes");
    expect(snacksForDay(p, "wed").inheritedFrom).toBeUndefined();
  });

  it("le message indique « (suite) » pour un snack reporté, sans le dupliquer dans les données", () => {
    const p = plan();
    const message = buildPlanMessage(p);
    expect(message).toContain(
      "Petit-déj & goûter / فطور / كوتي : Cake citron, Cake salé (suite)",
    );
    expect(p.slots.wed_snack).toBeUndefined();
  });
});

describe("passages multiples chez un même point de vente", () => {
  const item = (id: string, vendor: string, round?: number, checked = false) => ({
    id,
    name: id,
    vendor,
    ...(round ? { round } : {}),
    checked,
    createdAt: id.charCodeAt(0),
  });

  it("sépare un même point de vente en passages, dans l'ordre", () => {
    const groups = groupByVendor([
      item("a", "Épicier"),
      item("b", "Épicier", 2),
      item("c", "Boucher"),
      item("d", "Épicier"),
    ]);
    expect(groups.map((g) => [g.vendor, g.round])).toEqual([
      ["Boucher", 1],
      ["Épicier", 1],
      ["Épicier", 2],
    ]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["a", "d"]);
    expect(groups[2].items.map((i) => i.id)).toEqual(["b"]);
  });

  it("un article sans passage est au passage 1", () => {
    expect(roundOf({})).toBe(1);
    expect(roundOf({ round: 1 })).toBe(1);
    expect(roundOf({ round: 3 })).toBe(3);
    expect(roundOf({ round: 0 })).toBe(1);
  });

  it("nomme les passages à partir du deuxième", () => {
    expect(describeGroup("Épicier", 1)).toBe("Épicier");
    expect(describeGroup("Épicier", 2)).toBe("Épicier — 2e passage");
    expect(describeGroup("", 1)).toBe("Sans point de vente");
  });

  it("le message WhatsApp titre chaque passage séparément", () => {
    const message = buildShoppingMessage([
      item("a", "Épicier"),
      item("b", "Épicier", 2),
    ]);
    const lines = message.split("\n");
    expect(lines).toContain("*Épicier*");
    expect(lines).toContain("*Épicier — 2e passage*");
  });
});
