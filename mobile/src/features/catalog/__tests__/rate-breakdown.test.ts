import { buildBreakdown, calculateNights } from '../rate-breakdown';

describe('calculateNights', () => {
  it('returns the integer number of nights between two dates', () => {
    expect(calculateNights('2026-06-01', '2026-06-03')).toBe(2);
  });

  it('returns 0 when both dates are the same', () => {
    expect(calculateNights('2026-06-01', '2026-06-01')).toBe(0);
  });

  it('returns 0 when checkout is before checkin', () => {
    expect(calculateNights('2026-06-05', '2026-06-01')).toBe(0);
  });

  it('handles month boundaries', () => {
    expect(calculateNights('2026-06-29', '2026-07-02')).toBe(3);
  });

  it('returns 0 for invalid input', () => {
    expect(calculateNights('not-a-date', '2026-06-01')).toBe(0);
  });
});

describe('buildBreakdown', () => {
  it('computes subtotal, taxes (10%), service fee (5%) and total', () => {
    const b = buildBreakdown(100, 2);

    expect(b.pricePerNight).toBe(100);
    expect(b.nights).toBe(2);
    expect(b.subtotal).toBe(200);
    expect(b.taxes).toBe(20);
    expect(b.serviceFee).toBe(10);
    expect(b.total).toBe(230);
    expect(b.originalSubtotal).toBeUndefined();
    expect(b.originalPricePerNight).toBeUndefined();
  });

  it('rounds to two decimals', () => {
    const b = buildBreakdown(99.99, 3);

    expect(b.subtotal).toBe(299.97);
    expect(b.taxes).toBe(30);
    expect(b.serviceFee).toBe(15);
    expect(b.total).toBe(344.97);
  });

  it('exposes originalSubtotal and discount when a discount was applied', () => {
    const b = buildBreakdown(85, 2, 100);

    expect(b.originalPricePerNight).toBe(100);
    expect(b.originalSubtotal).toBe(200);
    expect(b.subtotal).toBe(170);
    expect(b.discount).toBe(30); // 200 − 170
  });

  it('ignores originalUnitPrice when it is not greater than unitPrice', () => {
    const b = buildBreakdown(100, 2, 100);

    expect(b.originalPricePerNight).toBeUndefined();
    expect(b.originalSubtotal).toBeUndefined();
    expect(b.discount).toBeUndefined();
  });

  it('treats negative nights as 0', () => {
    const b = buildBreakdown(100, -3);

    expect(b.nights).toBe(0);
    expect(b.subtotal).toBe(0);
    expect(b.total).toBe(0);
  });
});
