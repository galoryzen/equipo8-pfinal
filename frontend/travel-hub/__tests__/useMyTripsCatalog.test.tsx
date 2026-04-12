import { useMyTripsCatalog } from '@/app/hooks/useMyTripsCatalog';
import { getMyBookings } from '@/app/lib/api/booking';
import { fetchPropertyDetailsMap } from '@/app/lib/myTrips/loadPropertyDetails';
import type { BookingListItem } from '@/app/lib/types/booking';
import type { PropertyDetail } from '@/app/lib/types/catalog';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/api/booking', () => ({
  getMyBookings: vi.fn(),
}));

vi.mock('@/app/lib/myTrips/loadPropertyDetails', () => ({
  fetchPropertyDetailsMap: vi.fn(),
}));

function makeBooking(
  id: string,
  propertyId: string,
  roomTypeId = '60000000-0000-0000-0000-000000000001'
): BookingListItem {
  return {
    id,
    status: 'CONFIRMED',
    checkin: '2026-06-01',
    checkout: '2026-06-05',
    total_amount: '100',
    currency_code: 'USD',
    created_at: '2026-01-01',
    items: [{ property_id: propertyId, room_type_id: roomTypeId, quantity: 1 }],
  };
}

function minimalProperty(id: string): PropertyDetail {
  return {
    id,
    hotel_id: 'h',
    name: 'Prop',
    description: null,
    city: { id: 'c', name: 'C', department: null, country: 'CO' },
    address: null,
    rating_avg: null,
    review_count: 0,
    popularity_score: 0,
    default_cancellation_policy: null,
    images: [],
    amenities: [],
    policies: [],
    room_types: [],
  };
}

describe('useMyTripsCatalog', () => {
  beforeEach(() => {
    vi.mocked(getMyBookings).mockReset();
    vi.mocked(fetchPropertyDetailsMap).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    vi.mocked(getMyBookings).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useMyTripsCatalog());
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('loads bookings and catalog map on success', async () => {
    const bookings = [makeBooking('b1', 'p1')];
    const map = { p1: minimalProperty('p1') };
    vi.mocked(getMyBookings).mockResolvedValue(bookings);
    vi.mocked(fetchPropertyDetailsMap).mockResolvedValue(map);

    const { result } = renderHook(() => useMyTripsCatalog());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bookings).toEqual(bookings);
    expect(result.current.propertyById).toEqual(map);
    expect(result.current.error).toBeNull();
    expect(fetchPropertyDetailsMap).toHaveBeenCalledWith(['p1']);
  });

  it('deduplicates property_id across bookings and items', async () => {
    const pid = '30000000-0000-0000-0000-000000000001';
    const bookings = [makeBooking('b1', pid), makeBooking('b2', pid)];
    vi.mocked(getMyBookings).mockResolvedValue(bookings);
    vi.mocked(fetchPropertyDetailsMap).mockResolvedValue({ [pid]: minimalProperty(pid) });

    const { result } = renderHook(() => useMyTripsCatalog());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchPropertyDetailsMap).toHaveBeenCalledWith([pid]);
    expect(result.current.bookings).toHaveLength(2);
  });

  it('handles empty bookings without error', async () => {
    vi.mocked(getMyBookings).mockResolvedValue([]);
    vi.mocked(fetchPropertyDetailsMap).mockResolvedValue({});

    const { result } = renderHook(() => useMyTripsCatalog());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bookings).toEqual([]);
    expect(result.current.propertyById).toEqual({});
    expect(result.current.error).toBeNull();
    expect(fetchPropertyDetailsMap).toHaveBeenCalledWith([]);
  });

  it('sets error and clears data when getMyBookings fails', async () => {
    vi.mocked(getMyBookings).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useMyTripsCatalog());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network down');
    expect(result.current.bookings).toEqual([]);
    expect(result.current.propertyById).toEqual({});
    expect(fetchPropertyDetailsMap).not.toHaveBeenCalled();
  });

  it('uses generic message when thrown value is not an Error', async () => {
    vi.mocked(getMyBookings).mockRejectedValue('oops');

    const { result } = renderHook(() => useMyTripsCatalog());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Could not load trips');
  });

  it('keeps bookings when catalog map has partial nulls', async () => {
    const bookings = [makeBooking('b1', 'p1'), makeBooking('b2', 'p2')];
    vi.mocked(getMyBookings).mockResolvedValue(bookings);
    vi.mocked(fetchPropertyDetailsMap).mockResolvedValue({
      p1: minimalProperty('p1'),
      p2: null,
    });

    const { result } = renderHook(() => useMyTripsCatalog());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bookings).toEqual(bookings);
    expect(result.current.propertyById.p2).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('surfaces error when fetchPropertyDetailsMap throws', async () => {
    vi.mocked(getMyBookings).mockResolvedValue([makeBooking('b1', 'p1')]);
    vi.mocked(fetchPropertyDetailsMap).mockRejectedValue(new Error('catalog unavailable'));

    const { result } = renderHook(() => useMyTripsCatalog());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('catalog unavailable');
    expect(result.current.bookings).toEqual([]);
    expect(result.current.propertyById).toEqual({});
  });

  it('reload triggers another load', async () => {
    vi.mocked(getMyBookings).mockResolvedValue([]);
    vi.mocked(fetchPropertyDetailsMap).mockResolvedValue({});

    const { result } = renderHook(() => useMyTripsCatalog());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getMyBookings).toHaveBeenCalledTimes(1);

    result.current.reload();

    await waitFor(() => expect(getMyBookings).toHaveBeenCalledTimes(2));
  });
});
