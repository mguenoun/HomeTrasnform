const MAD_FORMATTER = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMad(amount: number): string {
  return `${MAD_FORMATTER.format(amount)} MAD`;
}
