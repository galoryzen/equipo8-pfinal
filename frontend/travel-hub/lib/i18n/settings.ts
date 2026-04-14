export const defaultLocale = 'en-US' as const;
export const locales = ['en-US', 'es-CO'] as const;

export type AppLocale = (typeof locales)[number];

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}
