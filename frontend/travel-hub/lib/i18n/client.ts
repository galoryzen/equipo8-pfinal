import enUS from '@/lib/i18n/locales/en-US/common.json';
import { defaultLocale, locales } from '@/lib/i18n/settings';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const STORAGE_KEY = 'i18nextLng';

/**
 * Fixed initial language for SSR and the first client render so markup matches (avoids hydration errors).
 * User preference is applied after mount in `LanguageSync`.
 * Non-default locales (es-CO) are loaded lazily on demand to keep the initial
 * JS bundle smaller — they are only needed when the user explicitly switches language.
 */
void i18n.use(initReactI18next).init({
  lng: defaultLocale,
  fallbackLng: defaultLocale,
  supportedLngs: [...locales],
  resources: {
    'en-US': { common: enUS },
  },
  defaultNS: 'common',
  ns: ['common'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

/**
 * Dynamically load a locale bundle the first time it is needed.
 * The static export pre-renders all pages in en-US, so lazy loading other
 * locales is safe — they are only required after user interaction.
 */
async function loadLocale(lng: string): Promise<void> {
  if (lng === defaultLocale || i18n.hasResourceBundle(lng, 'common')) return;
  try {
    const { default: resources } = (await import(`@/lib/i18n/locales/${lng}/common.json`)) as {
      default: Record<string, unknown>;
    };
    i18n.addResourceBundle(lng, 'common', resources, true, false);
  } catch {
    /* fall back to default locale silently */
  }
}

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lng);
    } catch {
      /* ignore */
    }
  });

  // Prefetch es-CO during browser idle time so it is ready before the user
  // manually switches language, avoiding any visible flash of untranslated text.
  const prefetch = () => void loadLocale('es-CO');
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(prefetch, { timeout: 4000 });
  } else {
    setTimeout(prefetch, 2000);
  }
}

export { loadLocale };
export default i18n;
