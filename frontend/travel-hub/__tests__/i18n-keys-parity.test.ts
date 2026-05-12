import enGB from '@/lib/i18n/locales/en-GB/common.json';
import enUS from '@/lib/i18n/locales/en-US/common.json';
import esAR from '@/lib/i18n/locales/es-AR/common.json';
import esCL from '@/lib/i18n/locales/es-CL/common.json';
import esCO from '@/lib/i18n/locales/es-CO/common.json';
import esMX from '@/lib/i18n/locales/es-MX/common.json';
import { locales } from '@/lib/i18n/settings';
import { describe, expect, it } from 'vitest';

const localeMap: Record<string, unknown> = {
  'en-US': enUS,
  'es-CO': esCO,
  'es-AR': esAR,
  'es-MX': esMX,
  'en-GB': enGB,
  'es-CL': esCL,
};

function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (obj == null || typeof obj !== 'object') return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenKeys(v, key));
    } else {
      out.push(key);
    }
  }
  return out;
}

function diff(a: Set<string>, b: Set<string>) {
  return [...a].filter((k) => !b.has(k)).sort();
}

describe('i18n locale parity', () => {
  it('keeps en-US keys in sync with all other locales', () => {
    const reference = new Set(flattenKeys(enUS));

    for (const locale of locales) {
      if (locale === 'en-US') continue;
      const translated = new Set(flattenKeys(localeMap[locale]));
      const missingInTranslated = diff(reference, translated);
      const missingInRef = diff(translated, reference);

      expect(
        { locale, missingInTranslated, missingInRef },
        `Locale ${locale} has drifted from en-US; add the missing translation keys.`
      ).toEqual({ locale, missingInTranslated: [], missingInRef: [] });
    }
  });
});
