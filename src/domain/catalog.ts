/**
 * Clé de référentiel : deux saisies du même nom (casse, accents, hamza,
 * voyelles brèves, espaces) donnent la même clé, utilisable comme id de
 * document Firestore ("/" interdit, ni "." / ".." ni `__x__`).
 */
export function catalogKey(label: string): string {
  const key = label
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٟـ]/g, "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/[/\\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^_+.*_+$/.test(key) ? key.replace(/_/g, "") : key;
}
