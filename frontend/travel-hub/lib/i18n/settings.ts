export const defaultLocale = 'en-US' as const;
export const locales = ['en-US', 'es-CO', 'es-AR', 'es-MX', 'en-GB', 'es-CL'] as const;

export type AppLocale = (typeof locales)[number];

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

export const localeLabels: Record<AppLocale, string> = {
  'en-US': 'English (US)',
  'es-CO': 'Español (Colombia)',
  'es-AR': 'Español (Argentina)',
  'es-MX': 'Español (México)',
  'en-GB': 'English (UK)',
  'es-CL': 'Español (Chile)',
};

export const localeFlags: Record<AppLocale, string> = {
  'en-US': '🇺🇸',
  'es-CO': '🇨🇴',
  'es-AR': '🇦🇷',
  'es-MX': '🇲🇽',
  'en-GB': '🇬🇧',
  'es-CL': '🇨🇱',
};
