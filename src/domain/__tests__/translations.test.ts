import { describe, expect, it } from "vitest";
import { buildTranslationIndex, translationFor } from "../translations";

describe("buildTranslationIndex", () => {
  it("retrouve une traduction quelle que soit la graphie du nom", () => {
    const index = buildTranslationIndex([
      { name: "شعرية الحليب", translation: "Vermicelles au lait" },
    ]);
    expect(translationFor(index, "  شعرية الحليب ")).toBe("Vermicelles au lait");
    expect(translationFor(index, "Pâtes")).toBeUndefined();
  });

  it("ignore la casse et les accents", () => {
    const index = buildTranslationIndex([{ name: "Pâtes", translation: "معكرونة" }]);
    expect(translationFor(index, "PATES")).toBe("معكرونة");
  });

  it("la première traduction non vide l'emporte (référentiel avant éléments saisis)", () => {
    const index = buildTranslationIndex([
      { name: "Cake", translation: "كيك (référentiel)" },
      { name: "cake", translation: "autre" },
    ]);
    expect(translationFor(index, "Cake")).toBe("كيك (référentiel)");
  });

  it("saute les entrées sans traduction et prend la suivante", () => {
    const index = buildTranslationIndex([
      { name: "Cake" },
      { name: "Cake", translation: "   " },
      { name: "cake", translation: "كيك" },
    ]);
    expect(translationFor(index, "Cake")).toBe("كيك");
  });

  it("ignore les noms vides", () => {
    const index = buildTranslationIndex([{ name: "  ", translation: "x" }]);
    expect(index.size).toBe(0);
    expect(translationFor(index, "  ")).toBeUndefined();
  });

  it("tolère l'absence d'index", () => {
    expect(translationFor(undefined, "Cake")).toBeUndefined();
  });
});

describe("orthographes voisines", () => {
  const index = buildTranslationIndex([{ name: "كسكسو", translation: "Couscous" }]);

  it("retrouve la traduction malgré ى/ي, ة/ه ou des espaces différents", () => {
    expect(translationFor(index, "كسكسو")).toBe("Couscous");
    expect(translationFor(buildTranslationIndex([{ name: "شوربة", translation: "Soupe" }]), "شوربه")).toBe("Soupe");
    expect(translationFor(buildTranslationIndex([{ name: "مسمن", translation: "Msemen" }]), "م س م ن")).toBe("Msemen");
  });

  it("la clé exacte l'emporte sur une orthographe voisine", () => {
    const both = buildTranslationIndex([
      { name: "شوربه", translation: "voisine" },
      { name: "شوربة", translation: "exacte" },
    ]);
    expect(translationFor(both, "شوربة")).toBe("exacte");
  });

  it("ne confond pas deux noms réellement différents", () => {
    expect(translationFor(index, "كسكس")).toBeUndefined();
  });
});
