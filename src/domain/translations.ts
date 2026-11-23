import { catalogKey } from "./catalog";

/** Traduction connue par nom normalisé (voir `catalogKey`). */
export type TranslationIndex = Map<string, string>;

/** Préfixe des entrées « orthographe voisine », pour ne jamais les confondre avec une clé exacte. */
const LOOSE = "\u0000~";

/**
 * Clé tolérante aux variantes d'écriture courantes en arabe (ى/ي, ة/ه, ؤ/ئ/ء) et
 * aux espaces : « كسكسو » mal orthographié retrouve la traduction de sa version
 * corrigée. Sert uniquement de repli quand la clé exacte ne donne rien.
 */
export function looseKey(name: string): string {
  return catalogKey(name)
    .replace(/[ىئ]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ء/g, "")
    .replace(/\s+/g, "");
}

/**
 * Une traduction appartient au NOM, pas à l'endroit où il apparaît : un snack
 * traduit une fois l'est partout (programme, bibliothèque, autres semaines).
 * Les entrées sont lues dans l'ordre et la première traduction non vide d'un nom
 * l'emporte : on met donc d'abord le référentiel (corrigé à la main), puis les
 * éléments déjà saisis dans le programme et les courses.
 */
export function buildTranslationIndex(
  entries: Array<{ name: string; translation?: string }>,
): TranslationIndex {
  const index: TranslationIndex = new Map();
  for (const { name, translation } of entries) {
    const text = translation?.trim();
    const key = catalogKey(name);
    if (!text || !key) continue;
    if (!index.has(key)) index.set(key, text);
    const loose = LOOSE + looseKey(name);
    if (!index.has(loose)) index.set(loose, text);
  }
  return index;
}

export function translationFor(
  index: TranslationIndex | undefined,
  name: string,
): string | undefined {
  const key = catalogKey(name);
  if (!key || !index) return undefined;
  return index.get(key) ?? index.get(LOOSE + looseKey(name));
}
