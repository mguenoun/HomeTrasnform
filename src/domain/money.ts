const MAD_FORMATTER = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Montant sans unité, pour les tableaux où "(MAD)" figure dans l'en-tête. */
export function formatAmount(amount: number): string {
  return MAD_FORMATTER.format(amount);
}

export function formatMad(amount: number): string {
  return `${formatAmount(amount)} MAD`;
}
