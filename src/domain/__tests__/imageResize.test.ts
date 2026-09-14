import { describe, expect, it } from "vitest";
import { computeTargetDimensions } from "../imageResize";

describe("computeTargetDimensions", () => {
  it("ne redimensionne pas une image déjà dans les limites", () => {
    expect(computeTargetDimensions(800, 600, 1920)).toBeNull();
  });

  it("ne redimensionne pas une image exactement à la limite", () => {
    expect(computeTargetDimensions(1920, 1080, 1920)).toBeNull();
  });

  it("réduit une image paysage en conservant le ratio", () => {
    expect(computeTargetDimensions(4000, 3000, 2000)).toEqual({
      width: 2000,
      height: 1500,
    });
  });

  it("réduit une image portrait en conservant le ratio", () => {
    expect(computeTargetDimensions(3000, 4000, 2000)).toEqual({
      width: 1500,
      height: 2000,
    });
  });

  it("ne produit jamais une dimension nulle sur une image extrême", () => {
    const result = computeTargetDimensions(100000, 1, 1920);
    expect(result?.width).toBe(1920);
    expect(result?.height).toBeGreaterThanOrEqual(1);
  });
});
