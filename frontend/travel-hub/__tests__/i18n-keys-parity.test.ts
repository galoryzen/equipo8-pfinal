import enCommon from '@/lib/i18n/locales/en-US/common.json';
import esCommon from '@/lib/i18n/locales/es-CO/common.json';
import { describe, expect, it } from 'vitest';

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
  it('keeps en-US and es-CO common.json keys in sync', () => {
    const en = new Set(flattenKeys(enCommon));
    const es = new Set(flattenKeys(esCommon));

    const missingInEs = diff(en, es);
    const missingInEn = diff(es, en);

    expect(
      { missingInEs, missingInEn },
      'Locale keys drifted; add the missing translation keys to keep locales in sync.'
    ).toEqual({ missingInEs: [], missingInEn: [] });
  });
});
