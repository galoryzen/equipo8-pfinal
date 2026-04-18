import type { AxiosError } from 'axios';

import { api } from '@src/services/api';
import {
  ActiveCartConflictError,
  InventoryUnavailableError,
  cancelCartBooking,
  createCartBooking,
  getBookingDetail,
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
  unit_price: '120.00',
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
  unit_price: PAYLOAD.unit_price,
};

const DETAIL: BookingDetail = {
  ...CART,
  policy_type_applied: 'FULL',
  policy_hours_limit_applied: null,
  policy_refund_percent_applied: null,
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

describe('cancelCartBooking', () => {
  afterEach(() => jest.resetAllMocks());

  it('POSTs /v1/booking/bookings/{id}/cancel and returns the updated detail', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { ...DETAIL, status: 'CANCELLED' } });

    const result = await cancelCartBooking('b1');

    expect(mockedApi.post).toHaveBeenCalledWith('/v1/booking/bookings/b1/cancel');
    expect(result.status).toBe('CANCELLED');
  });
});
