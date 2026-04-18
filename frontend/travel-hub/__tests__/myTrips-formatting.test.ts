import {
  estimateGuestLabel,
  formatBookingRef,
  formatTripDate,
  getPrimaryRoomLabel,
  isPastTrip,
  primaryPropertyId,
  splitUpcomingPast,
} from '@/app/lib/myTrips/formatting';
import type { BookingListItem } from '@/app/lib/types/booking';
import type { PropertyDetail } from '@/app/lib/types/catalog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function booking(overrides: Partial<BookingListItem> = {}): BookingListItem {
  return {
    id: '90000000-0000-0000-0000-000000000001',
    status: 'CONFIRMED',
    checkin: '2026-06-01',
    checkout: '2026-06-05',
    total_amount: '100',
    currency_code: 'USD',
    property_id: '30000000-0000-0000-0000-000000000001',
    room_type_id: '60000000-0000-0000-0000-000000000001',
    created_at: '2026-01-01',
    ...overrides,
  };
}

function propertyWithRooms(roomTypes: PropertyDetail['room_types']): PropertyDetail {
  return {
    id: '30000000-0000-0000-0000-000000000001',
    hotel_id: 'h1',
    name: 'Hotel',
    description: null,
    city: { id: 'c1', name: 'Bogotá', department: null, country: 'CO' },
    address: null,
    rating_avg: null,
    review_count: 0,
    popularity_score: 0,
    default_cancellation_policy: null,
    images: [],
    amenities: [],
    policies: [],
    room_types: roomTypes,
  };
}

describe('formatTripDate', () => {
  it('formats valid ISO dates', () => {
    expect(formatTripDate('2026-03-15')).toMatch(/Mar/);
    expect(formatTripDate('2026-03-15')).toContain('2026');
  });

  it('returns original string on parse failure', () => {
    expect(formatTripDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatBookingRef', () => {
  it('produces a friendly ref from the booking id tail', () => {
    const ref = formatBookingRef('aaaaaaaa-bbbb-cccc-dddd-1234567890ab');
    expect(ref).toBe('Ref: #567890AB');
  });
});

describe('estimateGuestLabel', () => {
  it('returns null without room types', () => {
    const b = booking();
    expect(estimateGuestLabel(b, propertyWithRooms([]))).toBeNull();
    expect(estimateGuestLabel(b, null)).toBeNull();
    expect(estimateGuestLabel(b, undefined)).toBeNull();
  });

  it('returns capacity of the selected room type', () => {
    const b = booking({ room_type_id: 'r1' });
    const prop = propertyWithRooms([
      {
        id: 'r1',
        name: 'Double',
        capacity: 2,
        amenities: [],
        rate_plans: [],
        min_price: null,
      },
    ]);
    expect(estimateGuestLabel(b, prop)).toBe('2 Guests');
  });

  it('uses singular Guest when capacity is 1', () => {
    const b = booking({ room_type_id: 'r1' });
    const prop = propertyWithRooms([
      {
        id: 'r1',
        name: 'Single',
        capacity: 1,
        amenities: [],
        rate_plans: [],
        min_price: null,
      },
    ]);
    expect(estimateGuestLabel(b, prop)).toBe('1 Guest');
  });

  it('returns null when no matching room type is found', () => {
    const b = booking({ room_type_id: 'unknown-room' });
    const prop = propertyWithRooms([
      {
        id: 'r1',
        name: 'X',
        capacity: 2,
        amenities: [],
        rate_plans: [],
        min_price: null,
      },
    ]);
    expect(estimateGuestLabel(b, prop)).toBeNull();
  });
});

describe('primaryPropertyId', () => {
  it('returns booking property_id', () => {
    expect(primaryPropertyId(booking())).toBe('30000000-0000-0000-0000-000000000001');
  });
});

describe('getPrimaryRoomLabel', () => {
  it('returns room name when room type matches', () => {
    const b = booking();
    const prop = propertyWithRooms([
      {
        id: '60000000-0000-0000-0000-000000000001',
        name: 'Deluxe',
        capacity: 2,
        amenities: [],
        rate_plans: [],
        min_price: null,
      },
    ]);
    expect(getPrimaryRoomLabel(b, prop)).toBe('Deluxe');
  });

  it('returns null when no matching room type is found', () => {
    expect(getPrimaryRoomLabel(booking({ room_type_id: 'none' }), propertyWithRooms([]))).toBeNull();
  });
});

describe('isPastTrip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is true when checkout is before today', () => {
    expect(isPastTrip('2026-04-10')).toBe(true);
  });

  it('is false for today or future checkout', () => {
    expect(isPastTrip('2026-04-11')).toBe(false);
    expect(isPastTrip('2026-12-31')).toBe(false);
  });

  it('returns false on invalid date', () => {
    expect(isPastTrip('invalid')).toBe(false);
  });
});

describe('splitUpcomingPast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('splits bookings by checkout relative to today', () => {
    const past = booking({ id: 'past', checkout: '2026-04-01' });
    const upcoming = booking({ id: 'up', checkout: '2026-05-01' });
    const { past: p, upcoming: u } = splitUpcomingPast([past, upcoming]);
    expect(p.map((x) => x.id)).toEqual(['past']);
    expect(u.map((x) => x.id)).toEqual(['up']);
  });
});
