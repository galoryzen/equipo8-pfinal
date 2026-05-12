import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './en/common.json';
import es from './es/common.json';
import esCO from './es-CO/common.json';
import esMX from './es-MX/common.json';

export const SUPPORTED_LOCALES = ['en', 'es-CO', 'es-MX'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function resolveDeviceLocale(): SupportedLocale {
  const tag = getLocales()[0]?.languageTag ?? 'en';
  if (tag === 'es-CO' || tag === 'es-MX') return tag;
  if (tag.toLowerCase().startsWith('es')) return 'es-CO';
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    'es-CO': { translation: esCO },
    'es-MX': { translation: esMX },
  },
  lng: resolveDeviceLocale(),
  fallbackLng: {
    'es-CO': ['es', 'en'],
    'es-MX': ['es', 'en'],
    default: ['en'],
  },
  interpolation: {
    escapeValue: false,
  },
  showSupportNotice: false,
});

export default i18n;
