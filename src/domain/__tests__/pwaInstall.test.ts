import { describe, expect, it } from "vitest";
import { isIosDevice, shouldShowIosInstallHint } from "../pwaInstall";

describe("isIosDevice", () => {
  it("détecte un iPhone/iPad/iPod à partir du user-agent", () => {
    expect(isIosDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(
      true,
    );
    expect(isIosDevice("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe(true);
  });

  it("ne détecte pas Android ou desktop", () => {
    expect(isIosDevice("Mozilla/5.0 (Linux; Android 14)")).toBe(false);
    expect(isIosDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
  });
});

describe("shouldShowIosInstallHint", () => {
  it("s'affiche sur iOS quand l'app n'est ni installée ni masquée", () => {
    expect(
      shouldShowIosInstallHint({
        userAgent: "iPhone",
        isStandalone: false,
        dismissed: false,
      }),
    ).toBe(true);
  });

  it("ne s'affiche pas si l'app est déjà installée (mode standalone)", () => {
    expect(
      shouldShowIosInstallHint({
        userAgent: "iPhone",
        isStandalone: true,
        dismissed: false,
      }),
    ).toBe(false);
  });

  it("ne s'affiche pas si l'utilisateur l'a déjà masquée", () => {
    expect(
      shouldShowIosInstallHint({
        userAgent: "iPhone",
        isStandalone: false,
        dismissed: true,
      }),
    ).toBe(false);
  });

  it("ne s'affiche pas hors iOS", () => {
    expect(
      shouldShowIosInstallHint({
        userAgent: "Android",
        isStandalone: false,
        dismissed: false,
      }),
    ).toBe(false);
  });
});
