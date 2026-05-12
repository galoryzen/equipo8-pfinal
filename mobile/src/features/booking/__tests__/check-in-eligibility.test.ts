import {
  canShowCheckInQr,
  hoursUntilCheckIn,
} from '@src/features/booking/check-in-eligibility';

function bookingFor(
  partial: { status: string; checkin: string; checkout: string },
): { status: string; checkin: string; checkout: string } {
  return partial;
}

describe('hoursUntilCheckIn', () => {
  it('is ~24 when check-in is one day away at the same wall clock', () => {
    const now = new Date(2026, 4, 11, 0, 0, 0);
    expect(hoursUntilCheckIn('2026-05-12', now)).toBeCloseTo(24, 5);
  });

  it('is negative once the check-in midnight is in the past', () => {
    const now = new Date(2026, 4, 12, 12, 0, 0);
    expect(hoursUntilCheckIn('2026-05-12', now)).toBeCloseTo(-12, 5);
  });

  it('returns the partial hour for a same-day check-in', () => {
    const now = new Date(2026, 4, 11, 18, 0, 0);
    expect(hoursUntilCheckIn('2026-05-12', now)).toBeCloseTo(6, 5);
  });
});

describe('canShowCheckInQr', () => {
  const confirmed = bookingFor({
    status: 'CONFIRMED',
    checkin: '2026-05-12',
    checkout: '2026-05-15',
  });

  it('returns true for CONFIRMED < 24h before check-in', () => {
    const now = new Date(2026, 4, 11, 6, 0, 0);
    expect(canShowCheckInQr(confirmed, now)).toBe(true);
  });

  it('returns false for CONFIRMED but still >24h before check-in', () => {
    const now = new Date(2026, 4, 10, 0, 0, 0);
    expect(canShowCheckInQr(confirmed, now)).toBe(false);
  });

  it('returns false at exactly 24h before check-in (strict <)', () => {
    const now = new Date(2026, 4, 11, 0, 0, 0);
    expect(canShowCheckInQr(confirmed, now)).toBe(false);
  });

  it('returns true on the check-in day itself', () => {
    const now = new Date(2026, 4, 12, 14, 0, 0);
    expect(canShowCheckInQr(confirmed, now)).toBe(true);
  });

  it('returns true mid-stay (late check-in fallback)', () => {
    const now = new Date(2026, 4, 14, 10, 0, 0);
    expect(canShowCheckInQr(confirmed, now)).toBe(true);
  });

  it('returns false past the end of the checkout day', () => {
    const now = new Date(2026, 4, 16, 0, 0, 0);
    expect(canShowCheckInQr(confirmed, now)).toBe(false);
  });

  it('returns true on the checkout day before midnight', () => {
    const now = new Date(2026, 4, 15, 23, 59, 0);
    expect(canShowCheckInQr(confirmed, now)).toBe(true);
  });

  it('returns false when status is PENDING_PAYMENT even within 24h', () => {
    const now = new Date(2026, 4, 11, 18, 0, 0);
    expect(
      canShowCheckInQr(
        bookingFor({ ...confirmed, status: 'PENDING_PAYMENT' }),
        now,
      ),
    ).toBe(false);
  });

  it('returns false when status is PENDING_CONFIRMATION', () => {
    const now = new Date(2026, 4, 11, 18, 0, 0);
    expect(
      canShowCheckInQr(
        bookingFor({ ...confirmed, status: 'PENDING_CONFIRMATION' }),
        now,
      ),
    ).toBe(false);
  });

  it('returns false when already CHECKED_IN (helper gates pre-scan QR only)', () => {
    const now = new Date(2026, 4, 12, 18, 0, 0);
    expect(
      canShowCheckInQr(
        bookingFor({ ...confirmed, status: 'CHECKED_IN' }),
        now,
      ),
    ).toBe(false);
  });

  it('returns false when CANCELLED', () => {
    const now = new Date(2026, 4, 11, 18, 0, 0);
    expect(
      canShowCheckInQr(
        bookingFor({ ...confirmed, status: 'CANCELLED' }),
        now,
      ),
    ).toBe(false);
  });
});
