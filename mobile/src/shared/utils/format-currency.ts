import i18n from '@src/i18n/i18n';

export interface FormatCurrencyOptions {
  locale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
}

export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  opts: FormatCurrencyOptions = {},
): string {
  const lng = opts.locale ?? i18n.language ?? 'en';
  const maxFD = opts.maximumFractionDigits ?? 2;
  const minFD = opts.minimumFractionDigits ?? Math.min(maxFD, 2);
  try {
    return new Intl.NumberFormat(lng, {
      style: 'currency',
      currency,
      maximumFractionDigits: maxFD,
      minimumFractionDigits: minFD,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(maxFD)}`;
  }
}
