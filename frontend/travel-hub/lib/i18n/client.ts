import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { defaultLocale, locales } from '@/lib/i18n/settings';

import enUS from '@/lib/i18n/locales/en-US/common.json';
import esCO from '@/lib/i18n/locales/es-CO/common.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { common: enUS },
      'es-CO': { common: esCO },
    },
    fallbackLng: defaultLocale,
    supportedLngs: [...locales],
    defaultNS: 'common',
    ns: ['common'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

function normalizeToSupported(lng: string): string {
  const base = lng.split('-')[0]?.toLowerCase() ?? 'en';
  if (base === 'es') return 'es-CO';
  return defaultLocale;
}

i18n.on('initialized', () => {
  const lng = i18n.language;
  const next = normalizeToSupported(lng);
  if (lng !== next) void i18n.changeLanguage(next);
});

export default i18n;
