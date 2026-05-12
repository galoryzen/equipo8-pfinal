import rates from './fx-rates.json';

export const SUPPORTED_CURRENCIES = ['USD', 'COP', 'MXN', 'EUR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const FX_BASE = rates._meta.base;
const FX_RATES = rates.rates as Record<string, number>;

export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

export function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const fromRate = FX_RATES[from];
  const toRate = FX_RATES[to];
  if (fromRate == null) throw new Error(`fx-rates: unknown source currency "${from}"`);
  if (toRate == null) throw new Error(`fx-rates: unknown target currency "${to}"`);
  const inBase = from === FX_BASE ? amount : amount / fromRate;
  return to === FX_BASE ? inBase : inBase * toRate;
}

export const fxMeta = rates._meta;
