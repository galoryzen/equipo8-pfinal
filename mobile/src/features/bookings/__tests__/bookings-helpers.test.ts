import {
  formatBookingCode,
  isPastBookingForRebook,
  statusI18nKey,
} from '@src/features/bookings/bookings-helpers';
import type { BookingDetail } from '@src/types/booking';

describe('formatBookingCode', () => {
  it('returns # + first 8 uppercase chars of a UUID, stripping dashes', () => {
    expect(formatBookingCode('90000000-0000-0000-0000-000000000001')).toBe('#90000000');
  });

  it('handles UUIDs without dashes', () => {
    expect(formatBookingCode('abcdef0123456789')).toBe('#ABCDEF01');
  });

  it('returns the whole string uppercased when it is shorter than 8 chars', () => {
    expect(formatBookingCode('abc')).toBe('#ABC');
  });
});

describe('statusI18nKey', () => {
  it.each([
    ['CONFIRMED', 'trips.status.confirmed'],
    ['PENDING_PAYMENT', 'trips.status.pendingPayment'],
    ['PENDING_CONFIRMATION', 'trips.status.pendingConfirmation'],
    ['CANCELLED', 'trips.status.cancelled'],
    ['REJECTED', 'trips.status.rejected'],
  ])('maps %s to %s', (status, key) => {
    expect(statusI18nKey(status)).toBe(key);
  });

  it('falls back to confirmed for unknown status', () => {
    expect(statusI18nKey('UNKNOWN_STATUS')).toBe('trips.status.confirmed');
  });
});

describe('isPastBookingForRebook', () => {
  const today = new Date('2026-04-19T12:00:00Z');

  function detail(overrides: Partial<BookingDetail>): BookingDetail {
    return {
      id: 'b1',
      status: 'CONFIRMED',
      checkin: '2026-04-01',
      checkout: '2026-04-10',
      hold_expires_at: '2026-04-01T12:00:00',
      total_amount: '100.00',
      currency_code: 'USD',
      property_id: 'p1',
      room_type_id: 'r1',
      rate_plan_id: 'rp1',
      unit_price: '100.00',
      policy_type_applied: 'FULL',
      policy_hours_limit_applied: null,
      policy_refund_percent_applied: null,
      created_at: '2026-03-20T10:00:00',
      updated_at: '2026-03-20T10:00:00',
      ...overrides,
    };
  }

  it('returns true for CONFIRMED with checkout before today', () => {
    expect(
      isPastBookingForRebook(detail({ status: 'CONFIRMED', checkout: '2026-04-10' }), today),
    ).toBe(true);
  });

  it('returns false for CONFIRMED with checkout after today (still active)', () => {
    expect(
      isPastBookingForRebook(detail({ status: 'CONFIRMED', checkout: '2026-05-10' }), today),
    ).toBe(false);
  });

  it('returns true for CANCELLED regardless of dates', () => {
    expect(
      isPastBookingForRebook(detail({ status: 'CANCELLED', checkout: '2026-05-10' }), today),
    ).toBe(true);
  });

  it('returns true for REJECTED regardless of dates', () => {
    expect(
      isPastBookingForRebook(detail({ status: 'REJECTED', checkout: '2026-05-10' }), today),
    ).toBe(true);
  });

  it('returns false for PENDING_PAYMENT/PENDING_CONFIRMATION even if dates are in past', () => {
    expect(
      isPastBookingForRebook(
        detail({ status: 'PENDING_PAYMENT', checkout: '2026-04-10' }),
        today,
      ),
    ).toBe(false);
    expect(
      isPastBookingForRebook(
        detail({ status: 'PENDING_CONFIRMATION', checkout: '2026-04-10' }),
        today,
      ),
    ).toBe(false);
  });
});
