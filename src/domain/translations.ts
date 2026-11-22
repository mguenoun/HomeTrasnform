import { catalogKey } from "./catalog";

/** Traduction connue par nom normalisé (voir `catalogKey`). */
export type TranslationIndex = Map<string, string>;

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
    if (text && key && !index.has(key)) index.set(key, text);
  }
  return index;
}

export function translationFor(
  index: TranslationIndex | undefined,
  name: string,
): string | undefined {
  const key = catalogKey(name);
  return key ? index?.get(key) : undefined;
}
