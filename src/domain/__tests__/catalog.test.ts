import { describe, expect, it } from "vitest";
import { catalogKey } from "../catalog";

describe("catalogKey", () => {
  it("ignore la casse, les accents et les espaces superflus", () => {
    expect(catalogKey("  Pâtes   Bolognaise ")).toBe("pates bolognaise");
    expect(catalogKey("PATES bolognaise")).toBe("pates bolognaise");
  });

  it("unifie les variantes de hamza et ignore les voyelles brèves", () => {
    expect(catalogKey("الأحد")).toBe(catalogKey("الاحد"));
    expect(catalogKey("شَعْرِيَّة")).toBe(catalogKey("شعرية"));
  });

  it("produit un id Firestore valide (pas de / ni de .)", () => {
    expect(catalogKey("a/b.c")).toBe("a b c");
    expect(catalogKey("__x__")).toBe("x");
  });

  it("renvoie une chaîne vide pour un libellé vide", () => {
    expect(catalogKey("  ")).toBe("");
  });
});

describe("catalogKey, antislash", () => {
  it("remplace aussi l'antislash", () => {
    expect(catalogKey("a\\b")).toBe("a b");
  });
});
