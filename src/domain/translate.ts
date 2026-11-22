import { catalogKey } from "./catalog";

const ARABIC_LETTER = /[؀-ۿ]/;

/** Un texte contenant de l'arabe se traduit vers le français, sinon l'inverse. */
export function languagePair(text: string): { from: "ar" | "fr"; to: "ar" | "fr" } {
  return ARABIC_LETTER.test(text)
    ? { from: "ar", to: "fr" }
    : { from: "fr", to: "ar" };
}

export interface TranslationMatch {
  translation: string;
  /** Score de similarité de la source, entre 0 et 1. */
  match: number;
}

const MAX_SUGGESTIONS = 3;
const MIN_MATCH = 0.6;
const MIN_MAX_WORDS = 4;

function clean(raw: string): string {
  return raw
    .replace(/^[\s\-–—]+/, "")
    .replace(/[\s?!.…]+$/, "")
    .trim();
}

/**
 * Le service gratuit (MyMemory) s'appuie en partie sur des sous-titres : sa
 * première réponse est souvent du bruit ("- Oh, mon Dieu...") alors que les
 * suivantes contiennent la bonne forme courte ("Tomate"). On écarte les phrases
 * et le bruit, puis on classe : une traduction proposée plusieurs fois passe
 * devant, puis le meilleur score, puis la plus courte.
 */
export function rankSuggestions(
  source: string,
  matches: TranslationMatch[],
): string[] {
  const sourceKey = catalogKey(source);
  const stats = new Map<string, { text: string; count: number; best: number }>();

  for (const { translation, match } of matches) {
    if (match < MIN_MATCH || /\.\.\.|…|\n/.test(translation)) continue;
    const text = clean(translation);
    if (!text || catalogKey(text) === sourceKey) continue;
    // Un nom d'article ne devient pas une phrase : longueur bornée par celle
    // de la source (au moins 4 mots, pour « une pomme de terre »).
    const maxWords = Math.max(MIN_MAX_WORDS, source.trim().split(/\s+/).length * 3);
    if (text.split(/\s+/).length > maxWords) continue;
    const key = catalogKey(text);
    const entry = stats.get(key) ?? { text, count: 0, best: 0 };
    entry.count += 1;
    entry.best = Math.max(entry.best, match);
    stats.set(key, entry);
  }

  return [...stats.values()]
    .sort(
      (a, b) =>
        b.count - a.count || b.best - a.best || a.text.length - b.text.length,
    )
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.text);
}
