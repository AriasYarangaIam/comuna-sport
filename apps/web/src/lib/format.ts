const amountFormatter = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `S/ 50.00 PEN`, con dos decimales siempre. */
export const formatCurrency = (amount: number, currency = 'PEN'): string =>
  `S/ ${amountFormatter.format(amount)} ${currency}`;

/** `S/ 50.00`, para desgloses donde la moneda ya se anuncia. */
export const formatAmount = (amount: number): string =>
  `S/ ${amountFormatter.format(amount)}`;

export const formatCapacity = (capacity: number): string =>
  capacity === 1 ? '1 persona' : `${capacity} personas`;

export const pluralize = (
  count: number,
  singular: string,
  plural: string,
): string => `${count} ${count === 1 ? singular : plural}`;
