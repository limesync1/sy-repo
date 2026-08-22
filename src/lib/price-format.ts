/**
 * Ensartet dansk prisformat på hele platformen.
 *
 *   4840.6   → "4.840,60 kr."
 *   0        → "0,00 kr."
 *   1234567  → "1.234.567,00 kr."
 *
 * Brug ALTID disse hjælpere i stedet for `toFixed()` eller rå tal, så priser
 * ser ens ud i virksomhedspanelet, kundepanelet, på virksomhedssider og i kurven.
 */

const dkk = new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dkkCompact = new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Kun tallet: "4.840,60" */
export const formatAmount = (value: number | string | null | undefined): string => {
  const n = Number(value ?? 0);
  return dkk.format(Number.isFinite(n) ? n : 0);
};

/** Tal + valuta: "4.840,60 kr." */
export const formatPrice = (value: number | string | null | undefined): string =>
  `${formatAmount(value)} kr.`;

/**
 * Afrundet variant uden decimaler — kun til steder hvor pladsen er meget
 * knap (fx tætte tabeller/diagrammer). "4.841 kr."
 */
export const formatPriceRounded = (value: number | string | null | undefined): string => {
  const n = Number(value ?? 0);
  return `${dkkCompact.format(Number.isFinite(n) ? n : 0)} kr.`;
};

/** "4.840,60 kr./time" osv. */
export const formatPricePerUnit = (
  value: number | string | null | undefined,
  unit?: string | null,
): string => (unit ? `${formatPrice(value)}/${unit}` : formatPrice(value));
