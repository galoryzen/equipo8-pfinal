import { AppLocale, locales } from '@/lib/i18n/settings';

const localeByRegion: Record<string, AppLocale> = {
  CO: 'es-CO',
  AR: 'es-AR',
  MX: 'es-MX',
  CL: 'es-CL',
  US: 'en-US',
  GB: 'en-GB',
  AU: 'en-US',
  CA: 'en-US',
  DE: 'en-US',
  FR: 'en-US',
  BR: 'es-CO',
  PE: 'es-CO',
  EC: 'es-CO',
  VE: 'es-CO',
  UY: 'es-AR',
  PY: 'es-AR',
};

export function detectUserLocale(): AppLocale {
  return fallbackByNavigatorLanguage();
}

function fallbackByNavigatorLanguage(): AppLocale {
  if (typeof navigator === 'undefined') return 'en-US';

  const lang = navigator.language;
  const [language, region] = lang.split('-');

  const mapped = region && (localeByRegion[region] ?? (language === 'es' ? 'es-CO' : null));

  if (mapped && (locales as readonly string[]).includes(mapped)) {
    return mapped;
  }

  if (language === 'es' && (locales as readonly string[]).includes('es-CO')) {
    return 'es-CO';
  }
  if (language === 'en' && (locales as readonly string[]).includes('en-US')) {
    return 'en-US';
  }

  return 'en-US';
}

export async function detectUserLocaleByGeo(): Promise<AppLocale> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return fallbackByNavigatorLanguage();
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const country = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        resolve(country ? mapCountryToLocale(country) : fallbackByNavigatorLanguage());
      },
      () => {
        resolve(fallbackByNavigatorLanguage());
      },
      { timeout: 5000, maximumAge: 1000 * 60 * 60 }
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`,
      { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.address?.country_code?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

function mapCountryToLocale(countryCode: string): AppLocale {
  const mapped = localeByRegion[countryCode];
  if (mapped && (locales as readonly string[]).includes(mapped)) {
    return mapped;
  }
  return 'en-US';
}
