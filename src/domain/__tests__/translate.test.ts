import { describe, expect, it } from "vitest";
import { languagePair, rankSuggestions } from "../translate";

describe("languagePair", () => {
  it("traduit l'arabe vers le français, et le reste vers l'arabe", () => {
    expect(languagePair("طماطم")).toEqual({ from: "ar", to: "fr" });
    expect(languagePair("tomates")).toEqual({ from: "fr", to: "ar" });
    expect(languagePair("Tomates طماطم")).toEqual({ from: "ar", to: "fr" });
  });
});

describe("rankSuggestions", () => {
  it("écarte le bruit de sous-titres et garde la forme courte (cas réel : طماطم)", () => {
    // Réponse réelle du service : le premier résultat est du bruit.
    expect(
      rankSuggestions("طماطم", [
        { translation: "- Oh, mon Dieu...", match: 1 },
        { translation: "Tomate", match: 1 },
        { translation: "Tomate", match: 0.99 },
      ]),
    ).toEqual(["Tomate"]);
  });

  it("écarte les phrases longues et les questions (cas réel : بطاطة)", () => {
    expect(
      rankSuggestions("بطاطة", [
        { translation: "Une pomme de terre ?", match: 0.98 },
        { translation: "Pomme de terre", match: 0.85 },
        { translation: "Tu sais que ce j'aimerais ?", match: 0.66 },
      ]),
    ).toEqual(["Une pomme de terre", "Pomme de terre"]);
  });

  it("classe d'abord ce qui est proposé plusieurs fois", () => {
    expect(
      rankSuggestions("poulet", [
        { translation: "دجاجة", match: 0.99 },
        { translation: "دجاج", match: 0.97 },
        { translation: "دجاج", match: 0.96 },
      ]),
    ).toEqual(["دجاج", "دجاجة"]);
  });

  it("dédoublonne sans tenir compte de la casse ni des accents", () => {
    expect(
      rankSuggestions("x", [
        { translation: "Pâtes", match: 0.9 },
        { translation: "pates", match: 0.8 },
      ]),
    ).toEqual(["Pâtes"]);
  });

  it("n'en garde que trois, et ignore les scores trop faibles", () => {
    const matches = ["a1", "b2", "c3", "d4"].map((translation, i) => ({
      translation,
      match: 0.9 - i * 0.01,
    }));
    expect(rankSuggestions("x", matches)).toHaveLength(3);
    expect(rankSuggestions("x", [{ translation: "faible", match: 0.4 }])).toEqual([]);
  });

  it("ne renvoie pas la source elle-même", () => {
    expect(rankSuggestions("Tomate", [{ translation: "tomate", match: 1 }])).toEqual([]);
  });

  it("renvoie une liste vide sans résultat", () => {
    expect(rankSuggestions("x", [])).toEqual([]);
  });
});
