import type { AxiosError } from 'axios';

import { api } from '@src/services/api';
import {
  ActiveCartConflictError,
  InventoryUnavailableError,
  RateUnavailableError,
  cancelCartBooking,
  createCartBooking,
  getBookingDetail,
  listMyBookings,
} from '@src/services/booking-service';
import type { BookingDetail, CartBooking, CreateCartBookingPayload } from '@src/types/booking';

jest.mock('@src/services/api');

const mockedApi = api as jest.Mocked<typeof api>;

const PAYLOAD: CreateCartBookingPayload = {
  checkin: '2026-05-01',
  checkout: '2026-05-04',
  currency_code: 'USD',
  property_id: 'p1',
  room_type_id: 'r1',
  rate_plan_id: 'rp1',
  guests_count: 1,
};

const CART: CartBooking = {
  id: 'b1',
  status: 'CART',
  checkin: PAYLOAD.checkin,
  checkout: PAYLOAD.checkout,
  hold_expires_at: '2026-04-18T21:00:00',
  total_amount: '360.00',
  currency_code: 'USD',
  property_id: PAYLOAD.property_id,
  room_type_id: PAYLOAD.room_type_id,
  rate_plan_id: PAYLOAD.rate_plan_id,
  unit_price: '120.00',
  guests_count: 1,
  nights_breakdown: [
    { day: '2026-05-01', price: '120.00', original_price: null },
    { day: '2026-05-02', price: '120.00', original_price: null },
    { day: '2026-05-03', price: '120.00', original_price: null },
  ],
  taxes: '36.00',
  service_fee: '18.00',
  grand_total: '414.00',
};

const DETAIL: BookingDetail = {
  ...CART,
  policy_type_applied: 'FULL',
  policy_hours_limit_applied: null,
  policy_refund_percent_applied: null,
  guests: [],
  created_at: '2026-04-18T20:45:00',
  updated_at: '2026-04-18T20:45:00',
};

function axiosError(status: number, data?: unknown): AxiosError {
  const err = new Error('request failed') as AxiosError;
  err.isAxiosError = true;
  err.response = { status, data } as AxiosError['response'];
  return err;
}

describe('createCartBooking', () => {
  afterEach(() => jest.resetAllMocks());

  it('POSTs to /v1/booking/bookings and returns the cart', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: CART });

    const result = await createCartBooking(PAYLOAD);

    expect(mockedApi.post).toHaveBeenCalledWith('/v1/booking/bookings', PAYLOAD);
    expect(result).toEqual(CART);
  });

  it('throws InventoryUnavailableError on 409 without CART_ALREADY_EXISTS code', async () => {
    mockedApi.post.mockRejectedValueOnce(axiosError(409, { code: 'INVENTORY_UNAVAILABLE' }));
    await expect(createCartBooking(PAYLOAD)).rejects.toBeInstanceOf(InventoryUnavailableError);
  });

  it('throws ActiveCartConflictError on 409 with CART_ALREADY_EXISTS code', async () => {
    mockedApi.post.mockRejectedValueOnce(
      axiosError(409, { code: 'CART_ALREADY_EXISTS', existing_booking_id: 'other-cart-id' }),
    );
    const err = await createCartBooking(PAYLOAD).catch((e) => e);
    expect(err).toBeInstanceOf(ActiveCartConflictError);
    expect((err as ActiveCartConflictError).existingBookingId).toBe('other-cart-id');
  });

  it('throws RateUnavailableError on 409 with RATE_UNAVAILABLE code', async () => {
    mockedApi.post.mockRejectedValueOnce(axiosError(409, { code: 'RATE_UNAVAILABLE' }));
    await expect(createCartBooking(PAYLOAD)).rejects.toBeInstanceOf(RateUnavailableError);
  });

  it('re-throws other errors unchanged', async () => {
    const original = axiosError(500);
    mockedApi.post.mockRejectedValueOnce(original);
    await expect(createCartBooking(PAYLOAD)).rejects.toBe(original);
  });
});

describe('getBookingDetail', () => {
  afterEach(() => jest.resetAllMocks());

  it('GETs /v1/booking/bookings/{id} and returns the detail', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: DETAIL });

    const result = await getBookingDetail('b1');

    expect(mockedApi.get).toHaveBeenCalledWith('/v1/booking/bookings/b1');
    expect(result).toEqual(DETAIL);
  });

  it('encodes booking ids that contain special characters', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: DETAIL });
    await getBookingDetail('with space');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/booking/bookings/with%20space');
  });
});

describe('listMyBookings', () => {
  afterEach(() => jest.resetAllMocks());

  it('defaults to scope=all', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });
    await listMyBookings();
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/booking/bookings', {
      params: { scope: 'all' },
    });
  });

  it('forwards scope=active as query param', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });
    await listMyBookings('active');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/booking/bookings', {
      params: { scope: 'active' },
    });
  });

  it('forwards scope=past as query param', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });
    await listMyBookings('past');
    expect(mockedApi.get).toHaveBeenCalledWith('/v1/booking/bookings', {
      params: { scope: 'past' },
    });
  });

  it('unwraps the paginated envelope returned by the backend', async () => {
    // Backend route: PaginatedBookingListOut = { items, total, page, page_size, total_pages }.
    // Without unwrap, `list.map(...)` in useMyBookings blows up with
    // "list.map is not a function" and Trips shows the load error.
    const item: Partial<CartBooking> = {
      id: 'b1',
      status: 'CONFIRMED',
      property_id: 'p1',
      room_type_id: 'r1',
    };
    mockedApi.get.mockResolvedValueOnce({
      data: { items: [item], total: 1, page: 1, page_size: 10, total_pages: 1 },
    });

    const result = await listMyBookings('active');

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b1');
  });
});

describe('cancelCartBooking', () => {
  afterEach(() => jest.resetAllMocks());

  it('POSTs /v1/booking/bookings/{id}/cancel and returns the updated detail', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { ...DETAIL, status: 'CANCELLED' } });

    const result = await cancelCartBooking('b1');

    expect(mockedApi.post).toHaveBeenCalledWith('/v1/booking/bookings/b1/cancel');
    expect(result.status).toBe('CANCELLED');
  });
});
