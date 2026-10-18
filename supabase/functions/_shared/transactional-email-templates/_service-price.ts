// Service/order amounts are stored excluding VAT; never convert them for display.
export const formatServicePrice = (amount: number): string =>
  `${new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)} uden moms`