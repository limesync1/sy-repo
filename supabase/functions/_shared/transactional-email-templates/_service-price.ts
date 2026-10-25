// Service/order amounts are stored excluding VAT. Display both: first the
// stored amount (uden moms), then the amount with Danish VAT (med moms).
// Never write the VAT amount back anywhere — presentation only.
export const VAT_RATE = 0.25

const money = (amount: number): string =>
  new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)

export const withVat = (amount: number): number =>
  Math.round((Number.isFinite(amount) ? amount : 0) * (1 + VAT_RATE) * 100) / 100

export const formatExVat = (amount: number): string => `${money(amount)} uden moms`
export const formatIncVat = (amount: number): string => `${money(withVat(amount))} med moms`

/** Single-line text: "599,00 kr. uden moms · 748,75 kr. med moms". */
export const formatServicePrice = (amount: number): string =>
  `${formatExVat(amount)} · ${formatIncVat(amount)}`
