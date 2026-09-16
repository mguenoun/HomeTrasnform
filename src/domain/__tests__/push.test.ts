import { describe, expect, it } from "vitest";
import { base64UrlToUint8Array } from "../push";

describe("base64UrlToUint8Array", () => {
  it("décode une clé base64url standard (avec - et _)", () => {
    // "Hello" en base64url
    const bytes = base64UrlToUint8Array("SGVsbG8");
    expect(new TextDecoder().decode(bytes)).toBe("Hello");
  });

  it("gère les caractères - et _ propres à base64url", () => {
    // octets choisis pour produire + et / en base64 standard
    const original = new Uint8Array([251, 255, 191]);
    const base64Url = btoa(String.fromCharCode(...original))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    expect(base64UrlToUint8Array(base64Url)).toEqual(original);
  });

  it("gère les longueurs nécessitant un padding différent", () => {
    for (const text of ["a", "ab", "abc", "abcd"]) {
      const base64Url = btoa(text)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const bytes = base64UrlToUint8Array(base64Url);
      expect(new TextDecoder().decode(bytes)).toBe(text);
    }
  });
});
