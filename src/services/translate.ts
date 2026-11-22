import { languagePair, rankSuggestions } from "../domain/translate";

const ENDPOINT = "https://api.mymemory.translated.net/get";

interface MyMemoryResponse {
  quotaFinished?: boolean;
  responseStatus?: number | string;
  matches?: Array<{ translation?: string; match?: number | string }>;
}

/**
 * Propose jusqu'à trois traductions (français ↔ arabe) via MyMemory, service
 * gratuit sans clé. Seul le texte du plat ou de l'article est envoyé, rien de
 * personnel. Ce ne sont que des suggestions : la qualité est correcte pour les
 * mots courants, mauvaise pour le vocabulaire marocain, et le résultat doit
 * toujours être relu avant enregistrement.
 */
export async function suggestTranslations(
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const source = text.trim();
  if (!source) return [];
  const { from, to } = languagePair(source);
  const url = `${ENDPOINT}?q=${encodeURIComponent(source)}&langpair=${from}%7C${to}`;

  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch {
    throw new Error("Service de traduction injoignable. Vérifiez la connexion.");
  }
  if (!response.ok) {
    throw new Error("Le service de traduction a refusé la demande.");
  }
  const data = (await response.json()) as MyMemoryResponse;
  if (data.quotaFinished) {
    throw new Error("Quota gratuit de traduction épuisé pour aujourd'hui.");
  }
  return rankSuggestions(
    source,
    (data.matches ?? [])
      .filter((m) => typeof m.translation === "string")
      .map((m) => ({
        translation: m.translation as string,
        match: Number(m.match ?? 0),
      })),
  );
}
