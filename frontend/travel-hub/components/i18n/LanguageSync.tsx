'use client';

import { useEffect, useRef } from 'react';

import i18n, { loadLocale } from '@/lib/i18n/client';
import { detectUserLocale, detectUserLocaleByGeo } from '@/lib/i18n/geoDetect';
import { AppLocale, isAppLocale, locales } from '@/lib/i18n/settings';

const STORAGE_KEY = 'i18nextLng';

function normalizeStored(raw: string | null): AppLocale | null {
  if (!raw) return null;
  if (isAppLocale(raw)) return raw;
  if ((locales as readonly string[]).includes(raw)) return raw as AppLocale;
  const base = raw.split('-')[0]?.toLowerCase();
  if (base === 'es') return 'es-CO';
  if (base === 'en') return 'en-US';
  return null;
}

export function LanguageSync() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function applyLocale() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const stored = normalizeStored(raw);
        if (stored && stored !== i18n.language) {
          await loadLocale(stored);
          await i18n.changeLanguage(stored);
          return;
        }
        if (!raw) {
          const detected = await detectUserLocaleByGeo();
          if (detected !== i18n.language) {
            await loadLocale(detected);
            await i18n.changeLanguage(detected);
          }
        }
      } catch {
        /* ignore */
      }
    }

    void applyLocale();
  }, []);

  return null;
}
