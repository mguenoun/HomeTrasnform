import { describe, expect, it } from "vitest";
import type { Dish, MealPlan, ShoppingItem } from "../../types";
import {
  checkCoverage,
  collectMissing,
  isInPantry,
  isOnList,
  mergeIngredients,
  resolveVariant,
  scaleQuantity,
} from "../coverage";

const ing = (name: string, quantity?: string) => (quantity ? { name, quantity } : { name });

describe("scaleQuantity", () => {
  it("met à l'échelle le nombre en tête et garde l'unité", () => {
    expect(scaleQuantity("2 kg", 1.5)).toBe("3 kg");
    expect(scaleQuantity("500 g", 0.5)).toBe("250 g");
    expect(scaleQuantity("1,5 kg", 2)).toBe("3 kg");
    expect(scaleQuantity("5 DH", 0.5)).toBe("2.5 DH");
  });

  it("ne devine pas quand il n'y a pas de nombre simple (fraction, mot)", () => {
    expect(scaleQuantity("1/4 kg", 2)).toBe("1/4 kg");
    expect(scaleQuantity("نصف كيلو", 2)).toBe("نصف كيلو");
    expect(scaleQuantity("باكية", 3)).toBe("باكية");
    expect(scaleQuantity(undefined, 2)).toBeUndefined();
  });
});

describe("mergeIngredients", () => {
  it("additionne les quantités d'un même ingrédient, sans tenir compte de la casse", () => {
    expect(
      mergeIngredients([
        [ing("Poulet", "1 kg"), ing("Sel")],
        [ing("poulet", "500 g"), ing("Ail", "1 tête")],
      ]),
    ).toEqual([
      { name: "Poulet", quantity: "1 kg + 500 g" },
      { name: "Sel" },
      { name: "Ail", quantity: "1 tête" },
    ]);
  });

  it("garde la quantité quand un seul des deux en a une, et ignore les noms vides", () => {
    expect(mergeIngredients([[ing("Sel")], [ing("sel", "1 pincée"), ing("  ")]])).toEqual([
      { name: "Sel", quantity: "1 pincée" },
    ]);
  });
});

describe("resolveVariant", () => {
  const dish = (variants: Array<[number, Array<ReturnType<typeof ing>>]>): Dish => ({
    id: "x",
    name: "x",
    basis: "persons",
    variants: variants.map(([n, ingredients]) => ({ n, ingredients })),
  });

  it("renvoie null pour un plat sans variante", () => {
    expect(resolveVariant({ id: "x", name: "x" }, 4)).toBeNull();
    expect(resolveVariant({ id: "x", name: "x", variants: [] }, 4)).toBeNull();
  });

  it("utilise la variante exacte", () => {
    const d = dish([[2, [ing("a", "1")]], [4, [ing("a", "2")]]]);
    expect(resolveVariant(d, 4)).toEqual({ ingredients: [ing("a", "2")], approx: false });
  });

  it("combine des variantes quand la somme est exacte : 6 = 4 + 2", () => {
    const d = dish([[2, [ing("riz", "200 g")]], [4, [ing("riz", "400 g")]]]);
    expect(resolveVariant(d, 6)).toEqual({
      ingredients: [{ name: "riz", quantity: "400 g + 200 g" }],
      approx: false,
    });
  });

  it("préfère le moins de parts : 8 = 4 + 4 plutôt que 2+2+2+2", () => {
    const d = dish([[2, [ing("a", "1")]], [4, [ing("a", "2")]]]);
    expect(resolveVariant(d, 8)?.ingredients).toEqual([{ name: "a", quantity: "2 + 2" }]);
  });

  it("combine aussi des tailles non consécutives : 7 = 5 + 2", () => {
    const d = dish([[2, [ing("a", "1")]], [5, [ing("a", "3")]]]);
    expect(resolveVariant(d, 7)?.ingredients).toEqual([{ name: "a", quantity: "3 + 1" }]);
  });

  it("une quantité multiple d'une seule variante (snack : 30 = 3 × 10)", () => {
    const d: Dish = {
      id: "p",
      name: "Pizza",
      basis: "units",
      variants: [{ n: 10, ingredients: [ing("farine", "500 g")] }],
    };
    expect(resolveVariant(d, 30)).toEqual({
      ingredients: [{ name: "farine", quantity: "500 g + 500 g + 500 g" }],
      approx: false,
    });
  });

  it("sinon met à l'échelle la variante la plus proche, marquée approchée", () => {
    const d = dish([[2, [ing("a", "100 g")]], [4, [ing("a", "200 g")]]]);
    // 3 : à égale distance de 2 et 4, on prend la plus grande (4) x 0,75
    expect(resolveVariant(d, 3)).toEqual({
      ingredients: [{ name: "a", quantity: "150 g" }],
      approx: true,
    });
    // 1 : seule 2 est proche, x 0,5
    expect(resolveVariant(d, 1)).toEqual({
      ingredients: [{ name: "a", quantity: "50 g" }],
      approx: true,
    });
  });

  it("une taille invalide retombe sur la plus petite variante, marquée approchée", () => {
    const d = dish([[4, [ing("a", "2")]], [2, [ing("a", "1")]]]);
    for (const bad of [0, -3, 2.5, NaN]) {
      expect(resolveVariant(d, bad)).toEqual({ ingredients: [ing("a", "1")], approx: true });
    }
  });

  it("ne mute pas les variantes du plat", () => {
    const d = dish([[2, [ing("a", "100 g")]], [4, [ing("a", "200 g")]]]);
    resolveVariant(d, 3);
    resolveVariant(d, 6);
    expect(d.variants?.[0].ingredients[0].quantity).toBe("100 g");
    expect(d.variants?.[1].ingredients[0].quantity).toBe("200 g");
  });

  it("au-delà du plafond de combinaisons, passe au proportionnel sans planter", () => {
    const d = dish([[4, [ing("a", "2 kg")]]]);
    // 1000 dépasse le plafond de 500 : pas de combinaison, donc proportionnel (x 250).
    expect(resolveVariant(d, 1000)).toEqual({
      ingredients: [{ name: "a", quantity: "500 kg" }],
      approx: true,
    });
  });
});

describe("isOnList", () => {
  const item = (name: string, translation?: string): ShoppingItem => ({
    id: name,
    name,
    ...(translation ? { translation } : {}),
    checked: false,
    createdAt: 1,
  });

  it("reconnaît le même nom malgré la casse, les accents et les espaces", () => {
    expect(isOnList("  Pâtes ", [item("pates")])).toBe(true);
  });

  it("reconnaît un ingrédient contenu dans un nom plus long, dans les deux sens", () => {
    expect(isOnList("طحين", [item("طحين فينو")])).toBe(true);
    expect(isOnList("طحين فينو", [item("طحين")])).toBe(true);
  });

  it("compare dans les deux langues grâce aux traductions connues", () => {
    const translations = new Map([["lait", "حليب"]]);
    expect(isOnList("Lait", [item("حليب")], translations)).toBe(true);
    expect(isOnList("حليب", [item("Lait")], new Map([["حليب", "lait"]]))).toBe(true);
  });

  it("utilise la traduction portée par l'article de la liste", () => {
    expect(isOnList("Lait", [item("حليب", "lait")])).toBe(true);
  });

  it("ne confond pas des noms différents", () => {
    expect(isOnList("شعرية", [item("سميدة")])).toBe(false);
    expect(isOnList("Poulet", [])).toBe(false);
  });

  it("n'utilise pas l'inclusion pour des noms de moins de 3 lettres", () => {
    expect(isOnList("ma", [item("maïs")])).toBe(false);
    expect(isOnList("ma", [item("ma")])).toBe(true);
  });

  it("un nom vide n'est jamais « sur la liste »", () => {
    expect(isOnList("  ", [item("")])).toBe(false);
  });
});

describe("isInPantry", () => {
  it("reconnaît un ingrédient en stock, par nom ou par traduction", () => {
    expect(isInPantry("Sel", new Set(["sel"]))).toBe(true);
    expect(isInPantry("ملح", new Set(["sel"]), new Map([["ملح", "sel"]]))).toBe(true);
    expect(isInPantry("Poivre", new Set(["sel"]))).toBe(false);
  });
});

describe("checkCoverage", () => {
  const plan = (slots: MealPlan["slots"]): MealPlan => ({
    weekId: "2026-11-21",
    defaultDiners: 4,
    slots,
  });
  const listItem = (name: string): ShoppingItem => ({ id: name, name, checked: false, createdAt: 1 });
  const shaaria: Dish = {
    id: "شعرية الحليب",
    name: "شعرية الحليب",
    basis: "persons",
    variants: [{ n: 4, ingredients: [ing("شعرية", "1 باكية"), ing("حليب", "1 لتر"), ing("سكر")] }],
  };

  it("signale les ingrédients d'un plat planifié absents de la liste (le cha3ria oublié)", () => {
    const checks = checkCoverage({
      plan: plan({ sat_dinner: { items: [{ label: "شعرية الحليب" }] } }),
      dishes: [shaaria],
      listItems: [listItem("حليب"), listItem("سكر")],
    });
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({
      status: "missing",
      dayFr: "Samedi",
      mealFr: "Dîner",
      n: 4,
      approx: false,
      missing: [{ name: "شعرية", quantity: "1 باكية" }],
    });
  });

  it("un plat dont tous les ingrédients sont dans la liste est complet", () => {
    const checks = checkCoverage({
      plan: plan({ sat_dinner: { items: [{ label: "شعرية الحليب" }] } }),
      dishes: [shaaria],
      listItems: [listItem("شعرية"), listItem("حليب"), listItem("سكر")],
    });
    expect(checks[0]).toMatchObject({ status: "ok", missing: [] });
  });

  it("ne contrôle que les plats encore planifiés", () => {
    const checks = checkCoverage({
      plan: plan({
        sat_dinner: {
          items: [
            { label: "شعرية الحليب", status: "prepared" },
            { label: "شعرية الحليب", status: "skipped" },
          ],
        },
      }),
      dishes: [shaaria],
      listItems: [],
    });
    expect(checks).toEqual([]);
  });

  it("signale un plat sans recette au lieu de l'ignorer en silence", () => {
    const checks = checkCoverage({
      plan: plan({ sat_lunch: { items: [{ label: "Couscous" }, { label: "Inconnu" }] } }),
      dishes: [{ id: "couscous", name: "Couscous" }],
      listItems: [],
    });
    expect(checks.map((c) => c.status)).toEqual(["no-recipe", "no-recipe"]);
    expect(checks[0].dish?.name).toBe("Couscous");
    expect(checks[1].dish).toBeUndefined();
  });

  it("choisit la recette selon les convives du repas : 6 = 4 + 2", () => {
    const dish: Dish = {
      id: "riz",
      name: "Riz",
      basis: "persons",
      variants: [
        { n: 2, ingredients: [ing("riz", "200 g")] },
        { n: 4, ingredients: [ing("riz", "400 g")] },
      ],
    };
    const checks = checkCoverage({
      plan: plan({ sat_lunch: { diners: 6, items: [{ label: "Riz" }] } }),
      dishes: [dish],
      listItems: [],
    });
    expect(checks[0].n).toBe(6);
    expect(checks[0].missing).toEqual([{ name: "riz", quantity: "400 g + 200 g" }]);
  });

  it("un snack « par unités » utilise la quantité saisie", () => {
    const pizza: Dish = {
      id: "pizza",
      name: "Pizza",
      basis: "units",
      variants: [
        { n: 10, ingredients: [ing("farine", "500 g")] },
        { n: 20, ingredients: [ing("farine", "1 kg")] },
      ],
    };
    const checks = checkCoverage({
      plan: plan({ sat_snack: { items: [{ label: "Pizza", n: 20 }] } }),
      dishes: [pizza],
      listItems: [],
    });
    expect(checks[0]).toMatchObject({ n: 20, approx: false, missing: [{ name: "farine", quantity: "1 kg" }] });
  });

  it("un snack « par unités » sans quantité retombe sur la plus petite recette, à vérifier", () => {
    const pizza: Dish = {
      id: "pizza",
      name: "Pizza",
      basis: "units",
      variants: [{ n: 10, ingredients: [ing("farine", "500 g")] }, { n: 20, ingredients: [ing("farine", "1 kg")] }],
    };
    const checks = checkCoverage({
      plan: plan({ sat_snack: { items: [{ label: "Pizza" }] } }),
      dishes: [pizza],
      listItems: [],
    });
    expect(checks[0]).toMatchObject({ n: undefined, approx: true, missing: [{ name: "farine", quantity: "500 g" }] });
  });

  it("un plat « par personnes » placé dans les snacks utilise les convives par défaut", () => {
    const tarte: Dish = {
      id: "tarte",
      name: "Tarte",
      basis: "persons",
      variants: [{ n: 4, ingredients: [ing("pommes", "4")] }],
    };
    const checks = checkCoverage({
      plan: plan({ sun_snack: { items: [{ label: "Tarte" }] } }),
      dishes: [tarte],
      listItems: [],
    });
    expect(checks[0].n).toBe(4);
    expect(checks[0].approx).toBe(false);
  });

  it("n'exige pas les ingrédients « en stock »", () => {
    const checks = checkCoverage({
      plan: plan({ sat_dinner: { items: [{ label: "شعرية الحليب" }] } }),
      dishes: [shaaria],
      listItems: [],
      pantryKeys: new Set(["سكر"]),
    });
    expect(checks[0].missing.map((m) => m.name)).toEqual(["شعرية", "حليب"]);
  });

  it("retrouve le plat malgré la casse ou une graphie différente", () => {
    const checks = checkCoverage({
      plan: plan({ sat_lunch: { items: [{ label: "  COUSCOUS " }] } }),
      dishes: [{ id: "couscous", name: "Couscous", basis: "persons", variants: [{ n: 4, ingredients: [ing("semoule")] }] }],
      listItems: [],
    });
    expect(checks[0].status).toBe("missing");
  });

  it("parcourt la semaine dans l'ordre : samedi d'abord, déjeuner avant dîner", () => {
    const dish: Dish = { id: "x", name: "X", basis: "persons", variants: [{ n: 4, ingredients: [ing("a")] }] };
    const checks = checkCoverage({
      plan: plan({
        fri_dinner: { items: [{ label: "X" }] },
        sat_dinner: { items: [{ label: "X" }] },
        sat_lunch: { items: [{ label: "X" }] },
      }),
      dishes: [dish],
      listItems: [],
    });
    expect(checks.map((c) => c.slot)).toEqual(["sat_lunch", "sat_dinner", "fri_dinner"]);
  });

  it("un programme vide ne produit aucun contrôle", () => {
    expect(checkCoverage({ plan: plan({}), dishes: [shaaria], listItems: [] })).toEqual([]);
  });
});

describe("collectMissing", () => {
  it("regroupe un ingrédient demandé par plusieurs plats, en cumulant quantités et plats", () => {
    const poulet: Dish = { id: "tajine", name: "Tajine", basis: "persons", variants: [{ n: 4, ingredients: [ing("poulet", "1 kg"), ing("oignon")] }] };
    const brochettes: Dish = { id: "brochettes", name: "Brochettes", basis: "persons", variants: [{ n: 4, ingredients: [ing("Poulet", "500 g")] }] };
    const checks = checkCoverage({
      plan: { weekId: "2026-11-21", defaultDiners: 4, slots: { sat_lunch: { items: [{ label: "Tajine" }] }, sun_dinner: { items: [{ label: "Brochettes" }] } } },
      dishes: [poulet, brochettes],
      listItems: [],
    });
    const missing = collectMissing(checks);
    expect(missing).toHaveLength(2);
    expect(missing[0]).toMatchObject({ name: "poulet", quantity: "1 kg + 500 g" });
    expect(missing[0].forDishes).toEqual(["Samedi · Déjeuner — Tajine", "Dimanche · Dîner — Brochettes"]);
    expect(missing[1]).toMatchObject({ name: "oignon", forDishes: ["Samedi · Déjeuner — Tajine"] });
  });

  it("ne renvoie rien quand tout est couvert", () => {
    expect(collectMissing([])).toEqual([]);
  });
});
