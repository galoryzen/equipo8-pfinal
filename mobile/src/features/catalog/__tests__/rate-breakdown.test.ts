import { buildBreakdownFromNights, calculateNights } from '../rate-breakdown';

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

describe('buildBreakdownFromNights', () => {
  it('sums per-night prices into subtotal — variable pricing', () => {
    const b = buildBreakdownFromNights(
      [
        { day: '2026-05-01', price: '140.00' },
        { day: '2026-05-02', price: '150.00' },
      ],
      { taxes: 29, serviceFee: 14.5 },
    );

    expect(b.nights).toBe(2);
    expect(b.subtotal).toBe(290);
    // Server-computed fees: backend uses shared.pricing constants.
    expect(b.taxes).toBe(29);
    expect(b.serviceFee).toBe(14.5);
    expect(b.total).toBe(333.5);
    expect(b.pricePerNight).toBe(145); // average — used for "$X × N nights" UI
  });

  it('exposes originalSubtotal and average originalPricePerNight when nights are discounted', () => {
    const b = buildBreakdownFromNights(
      [
        { day: '2026-05-01', price: '85.00', original_price: '100.00' },
        { day: '2026-05-02', price: '85.00', original_price: '100.00' },
      ],
      { taxes: 17, serviceFee: 8.5 },
    );

    expect(b.subtotal).toBe(170);
    expect(b.originalSubtotal).toBe(200);
    expect(b.discount).toBe(30);
    expect(b.originalPricePerNight).toBe(100);
  });

  it('returns zero totals when given an empty array', () => {
    const b = buildBreakdownFromNights([], { taxes: 0, serviceFee: 0 });

    expect(b.nights).toBe(0);
    expect(b.subtotal).toBe(0);
    expect(b.total).toBe(0);
    expect(b.pricePerNight).toBe(0);
  });

  it('does not expose discount fields when no night carries an original_price', () => {
    const b = buildBreakdownFromNights(
      [
        { day: '2026-05-01', price: '100.00' },
        { day: '2026-05-02', price: '100.00' },
      ],
      { taxes: 20, serviceFee: 10 },
    );

    expect(b.discount).toBeUndefined();
    expect(b.originalSubtotal).toBeUndefined();
    expect(b.originalPricePerNight).toBeUndefined();
  });

  it('defaults fees to 0 when none are provided (legacy rows)', () => {
    const b = buildBreakdownFromNights([
      { day: '2026-05-01', price: '100.00' },
    ]);

    expect(b.taxes).toBe(0);
    expect(b.serviceFee).toBe(0);
    expect(b.total).toBe(100);
  });
});
