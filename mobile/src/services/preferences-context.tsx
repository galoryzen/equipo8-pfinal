import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import i18n, { resolveDeviceLocale, type SupportedLocale } from '@src/i18n/i18n';
import { isSupportedCurrency, type SupportedCurrency } from '@src/shared/utils/fx-rates';

const PREFERENCES_KEY = 'travelhub.preferences';

interface StoredPreferences {
  locale?: SupportedLocale;
  displayCurrency?: SupportedCurrency;
}

interface PreferencesState {
  locale: SupportedLocale;
  displayCurrency: SupportedCurrency;
  loading: boolean;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  setDisplayCurrency: (currency: SupportedCurrency) => Promise<void>;
}

function defaultCurrencyForLocale(locale: SupportedLocale): SupportedCurrency {
  if (locale === 'es-CO') return 'COP';
  if (locale === 'es-MX') return 'MXN';
  return 'USD';
}

const PreferencesContext = createContext<PreferencesState | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const initialLocale = resolveDeviceLocale();
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);
  const [displayCurrency, setDisplayCurrencyState] = useState<SupportedCurrency>(
    defaultCurrencyForLocale(initialLocale),
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredPreferences;
          if (parsed.locale && (parsed.locale === 'en' || parsed.locale === 'es-CO' || parsed.locale === 'es-MX')) {
            setLocaleState(parsed.locale);
            if (i18n.language !== parsed.locale) {
              await i18n.changeLanguage(parsed.locale);
            }
          }
          if (parsed.displayCurrency && isSupportedCurrency(parsed.displayCurrency)) {
            setDisplayCurrencyState(parsed.displayCurrency);
          }
        }
      } catch {
        // AsyncStorage unavailable — fall back to device defaults already set.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: StoredPreferences) => {
    const current: StoredPreferences = { locale, displayCurrency };
    const merged = { ...current, ...next };
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(merged));
  }, [locale, displayCurrency]);

  const setLocale = useCallback(async (next: SupportedLocale) => {
    setLocaleState(next);
    await i18n.changeLanguage(next);
    await persist({ locale: next });
  }, [persist]);

  const setDisplayCurrency = useCallback(async (next: SupportedCurrency) => {
    setDisplayCurrencyState(next);
    await persist({ displayCurrency: next });
  }, [persist]);

  const value = useMemo<PreferencesState>(
    () => ({ locale, displayCurrency, loading, setLocale, setDisplayCurrency }),
    [locale, displayCurrency, loading, setLocale, setDisplayCurrency],
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesState {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
