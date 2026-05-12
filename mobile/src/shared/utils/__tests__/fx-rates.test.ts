import { convert, isSupportedCurrency } from '@src/shared/utils/fx-rates';

describe('fx-rates.convert', () => {
  it('returns the amount unchanged when source and target are equal', () => {
    expect(convert(100, 'USD', 'USD')).toBe(100);
    expect(convert(50.5, 'COP', 'COP')).toBe(50.5);
  });

  it('converts from base (USD) to other currencies using the table rate', () => {
    expect(convert(1, 'USD', 'COP')).toBeCloseTo(4150);
    expect(convert(1, 'USD', 'MXN')).toBeCloseTo(17.2);
    expect(convert(1, 'USD', 'EUR')).toBeCloseTo(0.92);
  });

  it('converts non-base currencies back to base', () => {
    expect(convert(4150, 'COP', 'USD')).toBeCloseTo(1);
    expect(convert(17.2, 'MXN', 'USD')).toBeCloseTo(1);
  });

  it('round-trips through the base currency for cross-currency pairs', () => {
    // 1 USD = 4150 COP, 1 USD = 17.2 MXN ⇒ 4150 COP = 17.2 MXN
    expect(convert(4150, 'COP', 'MXN')).toBeCloseTo(17.2, 2);
  });

  it('throws on unknown source currency', () => {
    expect(() => convert(10, 'XXX', 'USD')).toThrow(/unknown source currency/);
  });

  it('throws on unknown target currency', () => {
    expect(() => convert(10, 'USD', 'XXX')).toThrow(/unknown target currency/);
  });
});

describe('isSupportedCurrency', () => {
  it.each(['USD', 'COP', 'MXN', 'EUR'])('recognizes %s as supported', (code) => {
    expect(isSupportedCurrency(code)).toBe(true);
  });

  it('rejects unsupported codes', () => {
    expect(isSupportedCurrency('JPY')).toBe(false);
    expect(isSupportedCurrency('')).toBe(false);
  });
});
