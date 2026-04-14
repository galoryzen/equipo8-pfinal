import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { defaultLocale, locales } from '@/lib/i18n/settings';

import enUS from '@/lib/i18n/locales/en-US/common.json';
import esCO from '@/lib/i18n/locales/es-CO/common.json';

const STORAGE_KEY = 'i18nextLng';

/**
 * Fixed initial language for SSR and the first client render so markup matches (avoids hydration errors).
 * User preference is applied after mount in `LanguageSync`.
 */
void i18n.use(initReactI18next).init({
  lng: defaultLocale,
  fallbackLng: defaultLocale,
  supportedLngs: [...locales],
  resources: {
    'en-US': { common: enUS },
    'es-CO': { common: esCO },
  },
  defaultNS: 'common',
  ns: ['common'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lng);
    } catch {
      /* ignore */
    }
  });
}

export default i18n;
