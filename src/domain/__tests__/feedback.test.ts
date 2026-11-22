import { describe, expect, it } from "vitest";
import type { Dish, MealPlan } from "../../types";
import {
  approvalRate,
  buildFeedbackMessage,
  computeDishStats,
  sortDishes,
  withFeedback,
} from "../feedback";
import { withStatus } from "../mealStatus";

describe("withFeedback", () => {
  const prepared = { label: "Couscous", status: "prepared" as const };

  it("enregistre un retour sur un plat préparé, avec sa remarque rognée", () => {
    expect(withFeedback(prepared, "up")).toEqual({ ...prepared, feedback: "up" });
    expect(withFeedback(prepared, "down", "  trop salé ")).toEqual({
      ...prepared,
      feedback: "down",
      feedbackNote: "trop salé",
    });
  });

  it("remplace un retour existant et efface la remarque avec le retour", () => {
    const rated = { ...prepared, feedback: "up" as const, feedbackNote: "délicieux" };
    expect(withFeedback(rated, "down")).toEqual({ ...prepared, feedback: "down" });
    expect(withFeedback(rated, null)).toEqual(prepared);
  });

  it("ignore un retour sur un plat qui n'est pas préparé", () => {
    const planned = { label: "Tarte" };
    const skipped = { label: "Tarte", status: "skipped" as const };
    expect(withFeedback(planned, "up")).toBe(planned);
    expect(withFeedback(skipped, "down")).toBe(skipped);
  });

  it("ne mute pas l'élément d'origine", () => {
    const item = { ...prepared, feedback: "up" as const };
    withFeedback(item, null);
    expect(item.feedback).toBe("up");
  });
});

describe("le retour suit le statut", () => {
  const rated = {
    label: "Couscous",
    status: "prepared" as const,
    feedback: "up" as const,
    feedbackNote: "délicieux",
  };

  it("repasser à planifié ou non préparé efface le retour", () => {
    expect(withStatus(rated, "planned")).toEqual({ label: "Couscous" });
    expect(withStatus(rated, "skipped", "Pas le temps")).toEqual({
      label: "Couscous",
      status: "skipped",
      skipReason: "Pas le temps",
    });
  });

  it("re-marquer « préparé » conserve le retour déjà donné", () => {
    expect(withStatus(rated, "prepared")).toEqual(rated);
  });
});

const plan = (weekId: string, slots: MealPlan["slots"]): MealPlan => ({
  weekId,
  defaultDiners: 4,
  slots,
});

describe("computeDishStats", () => {
  const plans = [
    plan("2026-11-14", {
      sat_lunch: {
        items: [
          { label: "Couscous", status: "prepared", feedback: "up" },
          { label: "Tarte", status: "skipped", skipReason: "Pas le temps" },
        ],
      },
    }),
    plan("2026-11-21", {
      sat_lunch: { items: [{ label: "couscous", status: "prepared", feedback: "down" }] },
      sun_dinner: { items: [{ label: "COUSCOUS", status: "prepared" }, { label: "Pizza" }] },
    }),
  ];

  it("ne compte que les plats préparés, sans tenir compte de la casse", () => {
    const stats = computeDishStats(plans);
    expect(stats.get("couscous")).toEqual({
      served: 3,
      up: 1,
      down: 1,
      lastWeek: "2026-11-21",
    });
  });

  it("ignore les plats planifiés ou non préparés", () => {
    const stats = computeDishStats(plans);
    expect(stats.has("tarte")).toBe(false);
    expect(stats.has("pizza")).toBe(false);
  });

  it("renvoie un index vide sans programme", () => {
    expect(computeDishStats([]).size).toBe(0);
  });
});

describe("approvalRate", () => {
  it("est la part de 👍 parmi les retours donnés", () => {
    expect(approvalRate({ served: 4, up: 3, down: 1 })).toBe(0.75);
    expect(approvalRate({ served: 2, up: 0, down: 2 })).toBe(0);
  });

  it("est indéfini sans retour (servi mais jamais noté) ou sans statistiques", () => {
    expect(approvalRate({ served: 5, up: 0, down: 0 })).toBeUndefined();
    expect(approvalRate(undefined)).toBeUndefined();
  });
});

describe("sortDishes", () => {
  const dishes: Dish[] = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Bravo" },
    { id: "c", name: "Charlie" },
    { id: "d", name: "Delta" },
  ];
  const stats = new Map([
    ["alpha", { served: 5, up: 1, down: 3 }],
    ["bravo", { served: 2, up: 2, down: 0 }],
    ["charlie", { served: 9, up: 0, down: 0 }],
  ]);

  it("par nom", () => {
    expect(sortDishes(dishes, stats, "name").map((d) => d.name)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
      "Delta",
    ]);
  });

  it("mieux notés d'abord ; les plats sans retour passent après, par nom", () => {
    expect(sortDishes(dishes, stats, "approval").map((d) => d.name)).toEqual([
      "Bravo",
      "Alpha",
      "Charlie",
      "Delta",
    ]);
  });

  it("à égalité de taux, le plus de 👍 d'abord", () => {
    const tie = new Map([
      ["alpha", { served: 2, up: 1, down: 1 }],
      ["bravo", { served: 4, up: 2, down: 2 }],
    ]);
    expect(sortDishes(dishes.slice(0, 2), tie, "approval").map((d) => d.name)).toEqual([
      "Bravo",
      "Alpha",
    ]);
  });

  it("plus servis d'abord", () => {
    expect(sortDishes(dishes, stats, "served").map((d) => d.name)).toEqual([
      "Charlie",
      "Alpha",
      "Bravo",
      "Delta",
    ]);
  });

  it("ne mute pas la liste d'origine", () => {
    const copy = [...dishes];
    sortDishes(dishes, stats, "approval");
    expect(dishes).toEqual(copy);
  });
});

describe("buildFeedbackMessage (retour de fin de semaine)", () => {
  const week = plan("2026-11-21", {
    sat_lunch: {
      items: [
        { label: "Couscous", status: "prepared", feedback: "up", feedbackNote: "délicieux" },
        { label: "Salade", status: "prepared" },
      ],
    },
    sun_dinner: {
      items: [{ label: "Shaaria", status: "skipped", skipReason: "Ingrédient manquant" }],
    },
    mon_lunch: {
      items: [{ label: "Tajine", status: "prepared", feedback: "down", feedbackNote: "trop salé" }],
    },
    tue_snack: { items: [{ label: "Cake" }] },
  });

  it("remercie, puis sépare apprécié, à améliorer et non préparé, avec les remarques", () => {
    const message = buildFeedbackMessage(week);
    const lines = message.split("\n");
    expect(lines[0]).toBe("*Retour de la semaine — ملاحظات الأسبوع*");
    expect(message).toContain("Merci pour cette semaine !");
    expect(message).toContain("*Très appréciés — أعجبنا*");
    expect(message).toContain("👍 Couscous (samedi) : délicieux");
    expect(message).toContain("*À améliorer — للتحسين*");
    expect(message).toContain("👎 Tajine (lundi) : trop salé");
    expect(message).toContain("*Pas préparés — لم يتم تحضيرها*");
    expect(message).toContain("❌ Shaaria (dimanche) : Ingrédient manquant");
  });

  it("n'inclut ni les plats préparés sans retour, ni les plats seulement planifiés", () => {
    const message = buildFeedbackMessage(week);
    expect(message).not.toContain("Salade");
    expect(message).not.toContain("Cake");
  });

  it("n'affiche jamais de note chiffrée", () => {
    expect(buildFeedbackMessage(week)).not.toMatch(/\d+\s*\/\s*\d+|score|note :/i);
  });

  it("n'écrit que les sections qui ont du contenu", () => {
    const onlyLiked = plan("2026-11-21", {
      sat_lunch: { items: [{ label: "Couscous", status: "prepared", feedback: "up" }] },
    });
    const message = buildFeedbackMessage(onlyLiked);
    expect(message).toContain("Très appréciés");
    expect(message).not.toContain("À améliorer");
    expect(message).not.toContain("Pas préparés");
  });

  it("reprend la traduction du référentiel", () => {
    const onlyLiked = plan("2026-11-21", {
      sat_lunch: { items: [{ label: "Couscous", status: "prepared", feedback: "up" }] },
    });
    expect(buildFeedbackMessage(onlyLiked, new Map([["couscous", "كسكسو"]]))).toContain(
      "👍 Couscous — كسكسو (samedi)",
    );
  });

  it("reste un message valide sans aucun retour", () => {
    const message = buildFeedbackMessage(plan("2026-11-21", {}));
    expect(message).toContain("Merci pour cette semaine !");
    expect(message).not.toContain("👍");
  });
});
