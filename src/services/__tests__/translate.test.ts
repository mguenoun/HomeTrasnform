import { describe, expect, it, vi } from "vitest";
import { suggestTranslations } from "../translate";

function fakeFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("suggestTranslations", () => {
  it("interroge MyMemory dans le bon sens et classe les propositions", async () => {
    const fetchImpl = fakeFetch({
      matches: [
        { translation: "- Oh, mon Dieu...", match: 1 },
        { translation: "Tomate", match: "1" },
        { translation: "Tomate", match: 0.99 },
      ],
    });
    const result = await suggestTranslations("طماطم", fetchImpl);

    expect(result).toEqual(["Tomate"]);
    const url = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("langpair=ar%7Cfr");
    expect(url).toContain(encodeURIComponent("طماطم"));
  });

  it("traduit le français vers l'arabe", async () => {
    const fetchImpl = fakeFetch({ matches: [{ translation: "دجاج", match: 0.97 }] });
    await suggestTranslations("poulet", fetchImpl);
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(
      "langpair=fr%7Car",
    );
  });

  it("n'envoie rien pour un texte vide", async () => {
    const fetchImpl = fakeFetch({});
    expect(await suggestTranslations("   ", fetchImpl)).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("signale un quota épuisé", async () => {
    await expect(
      suggestTranslations("x", fakeFetch({ quotaFinished: true })),
    ).rejects.toThrow(/Quota/);
  });

  it("signale un refus du service", async () => {
    await expect(suggestTranslations("x", fakeFetch({}, false))).rejects.toThrow(
      /refusé/,
    );
  });

  it("signale un service injoignable", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    await expect(suggestTranslations("x", fetchImpl)).rejects.toThrow(/injoignable/);
  });

  it("tolère une réponse sans propositions", async () => {
    expect(await suggestTranslations("x", fakeFetch({}))).toEqual([]);
  });
});
