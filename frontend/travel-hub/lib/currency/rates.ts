export interface FrankfurterRate {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

function parseRatesResponse(raw: FrankfurterRate[]): ExchangeRates {
  const rates: Record<string, number> = {};
  let date = '';
  let base = '';

  for (const entry of raw) {
    if (!date) date = entry.date;
    if (!base) base = entry.base;
    rates[entry.quote] = entry.rate;
  }

  return { base, date, rates };
}

const FRANKFURTER_API =
  'https://api.frankfurter.dev/v2/rates?base=USD&quotes=USD,GBP,ARS,MXN,CLP,BRL,EUR,PEN,CAD,AUD,COP';
const STORAGE_KEY_RATES = 'travelhub_rates';
const STORAGE_KEY_TS = 'travelhub_rates_ts';
const CACHE_TTL_MS = 86400000;

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'COP', name: 'Colombian Peso', flag: '🇨🇴' },
  { code: 'ARS', name: 'Argentine Peso', flag: '🇦🇷' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'CLP', name: 'Chilean Peso', flag: '🇨🇱' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'PEN', name: 'Peruvian Sol', flag: '🇵🇪' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]['code'];

function getStoredRates(): ExchangeRates | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATES);
    const ts = localStorage.getItem(STORAGE_KEY_TS);
    if (!raw || !ts) return null;
    if (Date.now() - Number(ts) > CACHE_TTL_MS) return null;
    return JSON.parse(raw) as ExchangeRates;
  } catch {
    return null;
  }
}

function saveRates(rates: ExchangeRates): void {
  try {
    localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify(rates));
    localStorage.setItem(STORAGE_KEY_TS, String(Date.now()));
  } catch {
    /* ignore */
  }
}

let cachedRates: ExchangeRates | null = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATES);
    const ts = localStorage.getItem(STORAGE_KEY_TS);
    if (raw && ts && Date.now() - Number(ts) <= CACHE_TTL_MS) {
      return JSON.parse(raw) as ExchangeRates;
    }
  } catch {
    /* ignore */
  }
  return null;
})();

const GEO_CACHE_KEY = 'travelhub_user_country';

async function getUserCountry(): Promise<string | null> {
  if (typeof navigator === 'undefined') return null;

  try {
    const cached = localStorage.getItem(GEO_CACHE_KEY);
    if (cached) return cached;
  } catch {}

  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error('Geolocation API error');
    const data = (await res.json()) as { country_code?: string };
    if (data.country_code) {
      try {
        localStorage.setItem(GEO_CACHE_KEY, data.country_code);
      } catch {
        /* ignore */
      }
      return data.country_code;
    }
  } catch {
    /* ignore */
  }

  return null;
}

export async function getRates(): Promise<ExchangeRates> {
  if (cachedRates) return cachedRates;

  const stored = getStoredRates();
  if (stored) {
    cachedRates = stored;
    return stored;
  }

  try {
    const res = await fetch(FRANKFURTER_API, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('Frankfurter API error');
    const raw = (await res.json()) as FrankfurterRate[];
    cachedRates = parseRatesResponse(raw);
    saveRates(cachedRates);
    return cachedRates;
  } catch {
    cachedRates = { base: 'USD', date: new Date().toISOString().split('T')[0], rates: { USD: 1 } };
    return cachedRates;
  }
}

export function convertPrice(amount: number, fromCurrency: string, toCurrency: string): number {
  if (!cachedRates || !cachedRates.rates) return amount;
  if (fromCurrency === toCurrency) return amount;

  const fromRate = cachedRates.rates[fromCurrency] ?? 1;
  const toRate = cachedRates.rates[toCurrency] ?? 1;

  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

export function formatCurrency(
  amount: number,
  currency: string,
  options?: { locale?: string; decimals?: number }
): string {
  const { locale = 'en-US', decimals = 2 } = options ?? {};

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(amount);
}

export const countryToCurrency: Record<string, SupportedCurrency> = {
  CO: 'COP',
  AR: 'ARS',
  MX: 'MXN',
  CL: 'CLP',
  US: 'USD',
  GB: 'GBP',
  AU: 'AUD',
  CA: 'CAD',
  DE: 'EUR',
  FR: 'EUR',
  BR: 'BRL',
  PE: 'PEN',
  EC: 'COP',
  VE: 'USD',
  UY: 'ARS',
  PY: 'ARS',
};

export function detectCurrencyByCountry(): SupportedCurrency {
  if (typeof navigator === 'undefined') return 'USD';
  const region = navigator.language.split('-')[1];
  if (!region) return 'USD';

  return countryToCurrency[region] ?? 'USD';
}

export async function detectCurrencyByGeolocation(): Promise<SupportedCurrency> {
  console.log('Detecting user country for currency selection...');
  const countryCode = await getUserCountry();
  if (countryCode && countryToCurrency[countryCode]) {
    return countryToCurrency[countryCode];
  }
  return detectCurrencyByCountry();
}
