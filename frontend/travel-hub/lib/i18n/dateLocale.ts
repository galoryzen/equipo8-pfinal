/** BCP 47 locale for `toLocaleDateString` / formatting, aligned with app locales. */
export function dateFormattingLocale(i18nLanguage: string): string {
  if (i18nLanguage === 'en-GB') return 'en-GB';
  if (i18nLanguage.startsWith('es')) return 'es-CO';
  return 'en-US';
}
