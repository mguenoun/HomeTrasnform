import { afterEach, describe, expect, it, vi } from "vitest";
import { resizeImageIfNeeded } from "../imageResize";

function stubCreateImageBitmap(width: number, height: number) {
  const close = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width, height, close }),
  );
}

function stubCanvas(resultBlob: Blob | null) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) => {
      callback(resultBlob);
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resizeImageIfNeeded", () => {
  it("laisse un PDF inchangé (pas une image)", async () => {
    const createImageBitmapSpy = vi.fn();
    vi.stubGlobal("createImageBitmap", createImageBitmapSpy);
    const file = new File(["contenu"], "devis.pdf", {
      type: "application/pdf",
    });

    const result = await resizeImageIfNeeded(file);

    expect(result).toBe(file);
    expect(createImageBitmapSpy).not.toHaveBeenCalled();
  });

  it("laisse une image déjà petite inchangée", async () => {
    stubCreateImageBitmap(800, 600);
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

    const result = await resizeImageIfNeeded(file);

    expect(result).toBe(file);
  });

  it("redimensionne une grande photo et renvoie un fichier plus petit", async () => {
    stubCreateImageBitmap(4000, 3000);
    const smallerBlob = new Blob(["x"], { type: "image/jpeg" });
    stubCanvas(smallerBlob);

    const originalContent = new Uint8Array(1000);
    const file = new File([originalContent], "photo.jpg", {
      type: "image/jpeg",
    });

    const result = await resizeImageIfNeeded(file);

    expect(result).not.toBe(file);
    expect(result.name).toBe("photo.jpg");
    expect(result.type).toBe("image/jpeg");
    expect(result.size).toBeLessThan(file.size);
  });

  it("garde l'original si le redimensionnement ne réduit pas la taille", async () => {
    stubCreateImageBitmap(4000, 3000);
    const originalContent = new Uint8Array(10);
    const file = new File([originalContent], "photo.jpg", {
      type: "image/jpeg",
    });
    // Le "blob redimensionné" est plus gros que l'original (10 octets).
    const biggerBlob = new Blob([new Uint8Array(20)], { type: "image/jpeg" });
    stubCanvas(biggerBlob);

    const result = await resizeImageIfNeeded(file);

    expect(result).toBe(file);
  });

  it("garde l'original si createImageBitmap échoue", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("format non supporté")),
    );
    const file = new File(["x"], "photo.png", { type: "image/png" });

    const result = await resizeImageIfNeeded(file);

    expect(result).toBe(file);
  });

  it("garde l'original si le contexte canvas est indisponible", async () => {
    stubCreateImageBitmap(4000, 3000);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

    const result = await resizeImageIfNeeded(file);

    expect(result).toBe(file);
  });
});
