import i18n from '@src/i18n/i18n';
import { formatCurrency } from '@src/shared/utils/format-currency';

describe('formatCurrency', () => {
  const originalLanguage = i18n.language;

  afterEach(async () => {
    await i18n.changeLanguage(originalLanguage);
  });

  it('formats with the ISO currency code and locale-correct decimals when source equals display', () => {
    const formatted = formatCurrency(1234.56, 'USD', { locale: 'en' });
    // We force currencyDisplay: 'code' for cross-platform consistency, so the
    // output includes "USD" and the locale's grouping/decimal separators.
    expect(formatted).toContain('1,234.56');
    expect(formatted).toContain('USD');
    expect(formatted.startsWith('≈')).toBe(false);
  });

  it('prepends ≈ and converts when displayCurrency differs from source', () => {
    const formatted = formatCurrency(10, 'USD', { displayCurrency: 'COP', locale: 'en' });
    // 10 USD * 4150 = 41,500 COP; COP defaults to 0 decimals
    expect(formatted.startsWith('≈')).toBe(true);
    expect(formatted).toMatch(/41[\.,]500/);
  });

  it('does not prepend ≈ when displayCurrency equals source', () => {
    const formatted = formatCurrency(10, 'USD', { displayCurrency: 'USD', locale: 'en' });
    expect(formatted.startsWith('≈')).toBe(false);
  });

  it('falls back to plain string for unknown currency codes', () => {
    const formatted = formatCurrency(50, 'XYZ', { locale: 'en' });
    // Intl.NumberFormat throws on unknown codes; we fall through to the catch
    expect(formatted).toContain('XYZ');
    expect(formatted).toContain('50');
  });

  it('respects custom maximumFractionDigits override', () => {
    const formatted = formatCurrency(99.999, 'USD', {
      locale: 'en',
      maximumFractionDigits: 0,
    });
    // 99.999 rounded to 0 decimals = 100
    expect(formatted).toContain('100');
  });
});
