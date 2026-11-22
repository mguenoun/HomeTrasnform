import { describe, expect, it } from "vitest";
import type { Dish } from "../../types";
import { describeVariants, missingPersonSizes, sanitizeVariants } from "../dishes";

describe("sanitizeVariants", () => {
  it("rogne les noms, retire les lignes vides et omet la quantité vide", () => {
    expect(
      sanitizeVariants([
        {
          n: 4,
          ingredients: [
            { name: "  شعرية ", quantity: " 1 باكية " },
            { name: "   ", quantity: "2 kg" },
            { name: "حليب", quantity: "  " },
          ],
        },
      ]),
    ).toEqual([
      {
        n: 4,
        ingredients: [{ name: "شعرية", quantity: "1 باكية" }, { name: "حليب" }],
      },
    ]);
  });

  it("trie par taille croissante", () => {
    const variants = sanitizeVariants([
      { n: 5, ingredients: [{ name: "a" }] },
      { n: 2, ingredients: [{ name: "a" }] },
      { n: 4, ingredients: [{ name: "a" }] },
    ]);
    expect(variants.map((v) => v.n)).toEqual([2, 4, 5]);
  });

  it("ne garde qu'une variante par taille (la première)", () => {
    const variants = sanitizeVariants([
      { n: 4, ingredients: [{ name: "premier" }] },
      { n: 4, ingredients: [{ name: "second" }] },
    ]);
    expect(variants).toHaveLength(1);
    expect(variants[0].ingredients[0].name).toBe("premier");
  });

  it("rejette les tailles invalides (nulle, négative, décimale, NaN)", () => {
    const ingredients = [{ name: "a" }];
    expect(
      sanitizeVariants([
        { n: 0, ingredients },
        { n: -2, ingredients },
        { n: 2.5, ingredients },
        { n: NaN, ingredients },
      ]),
    ).toEqual([]);
  });

  it("n'enregistre pas une taille sans aucun ingrédient", () => {
    expect(
      sanitizeVariants([{ n: 3, ingredients: [{ name: "  " }] }]),
    ).toEqual([]);
  });

  it("ne mute pas son entrée", () => {
    const input = [{ n: 4, ingredients: [{ name: " x ", quantity: " 1 " }] }];
    sanitizeVariants(input);
    expect(input[0].ingredients[0]).toEqual({ name: " x ", quantity: " 1 " });
  });
});

describe("missingPersonSizes", () => {
  it("propose les tailles 2 à 5 non encore définies", () => {
    expect(missingPersonSizes([{ n: 4 }])).toEqual([2, 3, 5]);
    expect(missingPersonSizes([])).toEqual([2, 3, 4, 5]);
    expect(missingPersonSizes([{ n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }])).toEqual([]);
  });

  it("ignore les tailles hors 2–5 déjà définies (ex. 8)", () => {
    expect(missingPersonSizes([{ n: 8 }])).toEqual([2, 3, 4, 5]);
  });
});

describe("describeVariants", () => {
  const base: Dish = { id: "x", name: "x" };

  it("signale un plat sans ingrédients", () => {
    expect(describeVariants(base)).toBe("sans ingrédients");
    expect(describeVariants({ ...base, variants: [] })).toBe("sans ingrédients");
  });

  it("décrit les tailles en personnes", () => {
    expect(
      describeVariants({
        ...base,
        basis: "persons",
        variants: [
          { n: 2, ingredients: [] },
          { n: 4, ingredients: [] },
        ],
      }),
    ).toBe("2, 4 pers.");
  });

  it("trie les tailles même si elles sont stockées dans le désordre", () => {
    expect(
      describeVariants({
        ...base,
        basis: "persons",
        variants: [
          { n: 5, ingredients: [] },
          { n: 2, ingredients: [] },
        ],
      }),
    ).toBe("2, 5 pers.");
  });

  it("décrit les quantités d'un snack avec son unité", () => {
    expect(
      describeVariants({
        ...base,
        basis: "units",
        unitLabel: "petite pizza",
        variants: [{ n: 10, ingredients: [] }],
      }),
    ).toBe("10 petite pizza");
    expect(
      describeVariants({ ...base, basis: "units", variants: [{ n: 6, ingredients: [] }] }),
    ).toBe("6 unités");
  });
});
