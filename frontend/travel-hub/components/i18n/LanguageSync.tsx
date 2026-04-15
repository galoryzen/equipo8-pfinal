'use client';

import { useEffect, useRef } from 'react';

import i18n from '@/lib/i18n/client';
import { defaultLocale } from '@/lib/i18n/settings';

const STORAGE_KEY = 'i18nextLng';

function normalizeStored(raw: string | null): 'en-US' | 'es-CO' | null {
  if (!raw) return null;
  if (raw === 'en-US' || raw === 'es-CO') return raw;
  const base = raw.split('-')[0]?.toLowerCase();
  if (base === 'es') return 'es-CO';
  return defaultLocale;
}

/**
 * Applies `localStorage` or `navigator` language after hydration so it never diverges from SSR output.
 */
export function LanguageSync() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored = normalizeStored(raw);
      if (stored && stored !== i18n.language) {
        void i18n.changeLanguage(stored);
        return;
      }
      if (!raw && typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('es')) {
        void i18n.changeLanguage('es-CO');
      }
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
