import i18n from '@src/i18n/i18n';
import { convert, isSupportedCurrency } from '@src/shared/utils/fx-rates';

export interface FormatCurrencyOptions {
  locale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  /**
   * If provided and different from the source currency, the amount is
   * converted using the static fx-rates table and the result is prefixed
   * with "≈" to make the approximation visible to the user.
   */
  displayCurrency?: string;
}

export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  opts: FormatCurrencyOptions = {},
): string {
  const lng = opts.locale ?? i18n.language ?? 'en';
  const shouldConvert =
    !!opts.displayCurrency &&
    opts.displayCurrency !== currency &&
    isSupportedCurrency(opts.displayCurrency) &&
    isSupportedCurrency(currency);
  const targetCurrency = shouldConvert ? (opts.displayCurrency as string) : currency;
  const targetAmount = shouldConvert ? convert(amount, currency, targetCurrency) : amount;

  const maxFD = opts.maximumFractionDigits ?? (targetCurrency === 'COP' ? 0 : 2);
  const minFD = opts.minimumFractionDigits ?? Math.min(maxFD, 2);
  try {
    const formatted = new Intl.NumberFormat(lng, {
      style: 'currency',
      currency: targetCurrency,
      // Force the ISO code (USD, COP, MXN, EUR) instead of a localized symbol.
      // React Native Hermes ships incomplete ICU data — symbol coverage varies
      // wildly per currency × locale, and COP in particular silently drops to
      // a bare number. Codes always render and avoid ambiguity (es-CO uses "$"
      // for both USD and COP otherwise).
      currencyDisplay: 'code',
      maximumFractionDigits: maxFD,
      minimumFractionDigits: minFD,
    }).format(targetAmount);
    return shouldConvert ? `≈ ${formatted}` : formatted;
  } catch {
    const fallback = `${targetCurrency} ${targetAmount.toFixed(maxFD)}`;
    return shouldConvert ? `≈ ${fallback}` : fallback;
  }
}
