import { describe, expect, it } from "vitest";
import { formatMad } from "../money";

describe("formatMad", () => {
  it("formate un montant avec deux décimales et le suffixe MAD", () => {
    expect(formatMad(1234.5)).toBe("1 234,50 MAD");
  });

  it("formate zéro correctement", () => {
    expect(formatMad(0)).toBe("0,00 MAD");
  });

  it("formate un montant négatif", () => {
    expect(formatMad(-50)).toBe("-50,00 MAD");
  });
});
