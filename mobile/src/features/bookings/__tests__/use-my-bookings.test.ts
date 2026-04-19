import { act, renderHook, waitFor } from '@testing-library/react-native';

import { getPropertyDetail } from '@src/features/catalog/catalog-service';
import {
  clearBookingsCache,
  useMyBookings,
} from '@src/features/bookings/use-my-bookings';
import { listMyBookings } from '@src/services/booking-service';
import type { BookingListItem } from '@src/types/booking';
import type { PropertyDetailResponse } from '@src/types/catalog';

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('@src/services/booking-service', () => {
  const original = jest.requireActual('@src/services/booking-service');
  return {
    ...original,
    listMyBookings: jest.fn(),
  };
});

jest.mock('@src/features/catalog/catalog-service', () => ({
  getPropertyDetail: jest.fn(),
}));

const mockedListMy = listMyBookings as jest.MockedFunction<typeof listMyBookings>;
const mockedGetPropertyDetail = getPropertyDetail as jest.MockedFunction<
  typeof getPropertyDetail
>;

const BOOKING_A: BookingListItem = {
  id: 'b1',
  status: 'CONFIRMED',
  checkin: '2026-05-01',
  checkout: '2026-05-04',
  total_amount: '300.00',
  currency_code: 'USD',
  property_id: 'p1',
  room_type_id: 'r1',
  created_at: '2026-04-01T12:00:00',
};

const BOOKING_B: BookingListItem = { ...BOOKING_A, id: 'b2', property_id: 'p2' };
const BOOKING_C_SAME_PROP: BookingListItem = { ...BOOKING_A, id: 'b3' };

function detailResponse(name: string, cityName: string): PropertyDetailResponse {
  return {
    detail: {
      id: 'p1',
      hotel_id: 'h1',
      name,
      description: '',
      city: { id: 'c1', name: cityName, country: 'CO' },
      address: '',
      rating_avg: 4,
      review_count: 0,
      popularity_score: 0,
      images: [{ id: 'i1', url: 'https://example.com/1.jpg', display_order: 0 }],
      amenities: [],
      policies: [],
      room_types: [],
    },
    reviews: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
  };
}

describe('useMyBookings', () => {
  beforeEach(() => {
    clearBookingsCache();
    jest.resetAllMocks();
  });

  it('fetches bookings with the given scope and enriches with property details', async () => {
    mockedListMy.mockResolvedValueOnce([BOOKING_A]);
    mockedGetPropertyDetail.mockResolvedValueOnce(detailResponse('Casa Medina', 'Bogotá'));

    const { result } = renderHook(() => useMyBookings('active'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedListMy).toHaveBeenCalledWith('active');
    expect(result.current.bookings).toHaveLength(1);
    expect(result.current.bookings[0].property_name).toBe('Casa Medina');
    expect(result.current.bookings[0].city_name).toBe('Bogotá');
    expect(result.current.bookings[0].image_url).toBe('https://example.com/1.jpg');
    expect(result.current.error).toBeNull();
  });

  it('does not refetch the same property_id twice', async () => {
    mockedListMy.mockResolvedValueOnce([BOOKING_A, BOOKING_C_SAME_PROP]);
    mockedGetPropertyDetail.mockResolvedValueOnce(detailResponse('Casa Medina', 'Bogotá'));

    const { result } = renderHook(() => useMyBookings('active'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedGetPropertyDetail).toHaveBeenCalledTimes(1);
    expect(result.current.bookings[0].property_name).toBe('Casa Medina');
    expect(result.current.bookings[1].property_name).toBe('Casa Medina');
  });

  it('gracefully degrades when getPropertyDetail fails', async () => {
    mockedListMy.mockResolvedValueOnce([BOOKING_A]);
    mockedGetPropertyDetail.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useMyBookings('active'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.bookings[0].property_name).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('exposes error when listMyBookings fails', async () => {
    mockedListMy.mockRejectedValueOnce(new Error('500'));

    const { result } = renderHook(() => useMyBookings('past'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.bookings).toEqual([]);
  });

  it('refetch re-invokes listMyBookings', async () => {
    mockedListMy.mockResolvedValue([]);
    const { result } = renderHook(() => useMyBookings('active'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockedListMy).toHaveBeenCalledTimes(2);
  });
});
