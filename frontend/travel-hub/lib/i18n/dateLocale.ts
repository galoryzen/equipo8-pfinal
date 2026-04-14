/** BCP 47 locale for `toLocaleDateString` / formatting, aligned with app locales. */
export function dateFormattingLocale(i18nLanguage: string): string {
  return i18nLanguage.startsWith('es') ? 'es-CO' : 'en-US';
}
