/**
 * Initiales affichées dans la pastille de l'en-tête.
 * - 2 mots : initiale du prénom + initiale du nom ("Souleimane Guenoun" -> "SG").
 * - 3 mots ou plus : le premier mot est souvent un titre ou un prénom
 *   secondaire ("Sidi Mohamed GUENOUN"), on prend le 2e mot et le dernier
 *   ("MG").
 */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0][0].toUpperCase();
  const first = words.length >= 3 ? words[1] : words[0];
  const last = words[words.length - 1];
  return `${first[0]}${last[0]}`.toUpperCase();
}
