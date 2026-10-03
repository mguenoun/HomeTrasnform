import { describe, expect, it } from "vitest";
import { initialsOf } from "../initials";

describe("initialsOf", () => {
  it("prend prénom et nom pour un nom à deux mots", () => {
    expect(initialsOf("Souleimane Guenoun")).toBe("SG");
    expect(initialsOf("Khaoula Guenoun")).toBe("KG");
    expect(initialsOf("hajar guenoun")).toBe("HG");
  });

  it("ignore le premier mot pour un nom à trois mots", () => {
    expect(initialsOf("Sidi Mohamed GUENOUN")).toBe("MG");
  });

  it("gère un seul mot et l'absence de nom", () => {
    expect(initialsOf("Marie")).toBe("M");
    expect(initialsOf(null)).toBe("?");
  });
});
