'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  SUPPORTED_CURRENCIES,
  SupportedCurrency,
  convertPrice,
  formatCurrency as fmt,
  getRates,
} from '@/lib/currency/rates';

interface CurrencyContextValue {
  currency: SupportedCurrency;
  setCurrency: (c: SupportedCurrency) => void;
  formatPrice: (amount: number, fromCurrency?: string) => string;
  ratesLoaded: boolean;
  availableCurrencies: readonly { code: SupportedCurrency; name: string; flag: string }[];
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = 'travelhub_currency';

function getStoredCurrency(): SupportedCurrency | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as string;
    const valid = SUPPORTED_CURRENCIES.find((c) => c.code === parsed);
    return valid ? (valid.code as SupportedCurrency) : null;
  } catch {
    return null;
  }
}

function saveCurrency(c: SupportedCurrency): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

function getInitialCurrency(): SupportedCurrency {
  const stored = getStoredCurrency();
  if (stored) return stored;
  if (typeof navigator === 'undefined') return 'USD';
  const region = navigator.language.split('-')[1] ?? '';
  const map: Record<string, SupportedCurrency> = {
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
  return map[region] ?? 'USD';
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(getInitialCurrency);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  useEffect(() => {
    void getRates().then(() => setRatesLoaded(true));
  }, []);

  const setCurrency = useCallback((c: SupportedCurrency) => {
    setCurrencyState(c);
    saveCurrency(c);
  }, []);

  const formatPrice = useCallback(
    (amount: number, fromCurrency = 'USD'): string => {
      const converted = convertPrice(amount, fromCurrency, currency);
      const localeMap: Record<string, string> = {
        COP: 'es-CO',
        ARS: 'es-AR',
        MXN: 'es-MX',
        CLP: 'es-CL',
        GBP: 'en-GB',
        EUR: 'de-DE',
        BRL: 'pt-BR',
        PEN: 'es-PE',
        CAD: 'en-CA',
        AUD: 'en-AU',
        USD: 'en-US',
      };
      return fmt(converted, currency, { locale: localeMap[currency] ?? 'en-US' });
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatPrice,
        ratesLoaded,
        availableCurrencies: SUPPORTED_CURRENCIES,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
