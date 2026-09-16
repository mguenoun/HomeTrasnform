import { describe, expect, it } from "vitest";
import { stripUndefined } from "../sanitize";

describe("stripUndefined", () => {
  it("retire les clés dont la valeur est undefined", () => {
    expect(stripUndefined({ a: 1, b: undefined, c: "x" })).toEqual({
      a: 1,
      c: "x",
    });
  });

  it("conserve les valeurs null (valides pour Firestore)", () => {
    expect(stripUndefined({ a: null, b: 2 })).toEqual({ a: null, b: 2 });
  });

  it("conserve les valeurs falsy autres que undefined (0, '', false)", () => {
    expect(stripUndefined({ a: 0, b: "", c: false })).toEqual({
      a: 0,
      b: "",
      c: false,
    });
  });

  it("renvoie un objet vide si tout est undefined", () => {
    expect(stripUndefined({ a: undefined, b: undefined })).toEqual({});
  });
});
