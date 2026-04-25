import axios from 'axios';

import { api } from '@src/services/api';
import type {
  BookingDetail,
  BookingListItem,
  CartBooking,
  CreateCartBookingPayload,
  Guest,
  SaveGuestsPayload,
} from '@src/types/booking';

/**
 * Raised when Catalog rejects the hold (inventory insufficient for the range).
 * Surfaced to callers as a typed error so the UI can show a specific message
 * instead of a generic network failure.
 */
export class InventoryUnavailableError extends Error {
  constructor(message = 'Room no longer available for the selected dates') {
    super(message);
    this.name = 'InventoryUnavailableError';
  }
}

/**
 * Raised when the rate plan is missing pricing for one or more nights in the
 * selected range. The user must pick different dates.
 */
export class RateUnavailableError extends Error {
  constructor(message = 'Rates not available for the selected dates') {
    super(message);
    this.name = 'RateUnavailableError';
  }
}

/**
 * Raised when the backend rejects creation because the user already has another
 * active cart (one-cart-at-a-time rule). Carries the existing booking_id so the
 * client can offer the user to resume or cancel it before retrying.
 */
export class ActiveCartConflictError extends Error {
  constructor(public existingBookingId: string) {
    super(`User already has active cart ${existingBookingId}`);
    this.name = 'ActiveCartConflictError';
  }
}

export async function createCartBooking(
  payload: CreateCartBookingPayload,
): Promise<CartBooking> {
  try {
    const resp = await api.post<CartBooking>('/v1/booking/bookings', payload);
    return resp.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      const body = err.response?.data as { code?: string; existing_booking_id?: string } | undefined;
      if (body?.code === 'CART_ALREADY_EXISTS' && body.existing_booking_id) {
        throw new ActiveCartConflictError(body.existing_booking_id);
      }
      if (body?.code === 'RATE_UNAVAILABLE') {
        throw new RateUnavailableError();
      }
      throw new InventoryUnavailableError();
    }
    throw err;
  }
}

export type BookingScope = 'active' | 'past' | 'all';

export async function listMyBookings(
  scope: BookingScope = 'all',
): Promise<BookingListItem[]> {
  const resp = await api.get<BookingListItem[]>('/v1/booking/bookings', {
    params: { scope },
  });
  return resp.data;
}

export async function getBookingDetail(bookingId: string): Promise<BookingDetail> {
  const resp = await api.get<BookingDetail>(`/v1/booking/bookings/${encodeURIComponent(bookingId)}`);
  return resp.data;
}

export async function cancelCartBooking(bookingId: string): Promise<BookingDetail> {
  const resp = await api.post<BookingDetail>(
    `/v1/booking/bookings/${encodeURIComponent(bookingId)}/cancel`,
  );
  return resp.data;
}

/**
 * Typed error wrapping the 422 codes returned by PUT /bookings/:id/guests.
 * `code` mirrors backend: GUESTS_COUNT_MISMATCH | PRIMARY_GUEST_REQUIRED |
 * PRIMARY_GUEST_MISSING_CONTACT.
 */
export class GuestsValidationError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'GuestsValidationError';
  }
}

export async function saveBookingGuests(
  bookingId: string,
  payload: SaveGuestsPayload,
): Promise<Guest[]> {
  try {
    const resp = await api.put<Guest[]>(
      `/v1/booking/bookings/${encodeURIComponent(bookingId)}/guests`,
      payload,
    );
    return resp.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 422) {
      const body = err.response?.data as { code?: string; message?: string } | undefined;
      if (body?.code) {
        throw new GuestsValidationError(body.code, body.message ?? 'Invalid guests payload');
      }
    }
    throw err;
  }
}

export async function listBookingGuests(bookingId: string): Promise<Guest[]> {
  const resp = await api.get<Guest[]>(
    `/v1/booking/bookings/${encodeURIComponent(bookingId)}/guests`,
  );
  return resp.data;
}

/**
 * Raised when POST /checkout returns 409 or 422. `code` mirrors the backend
 * contract: INVALID_BOOKING_STATE (409, cart not in CART or hold expired) or
 * CHECKOUT_GUESTS_INCOMPLETE (422, guests missing/primary issue).
 */
export class CheckoutInvalidStateError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'CheckoutInvalidStateError';
  }
}

export async function checkoutBooking(bookingId: string): Promise<BookingDetail> {
  try {
    const resp = await api.post<BookingDetail>(
      `/v1/booking/bookings/${encodeURIComponent(bookingId)}/checkout`,
    );
    return resp.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const status = err.response.status;
      const body = err.response.data as { code?: string; message?: string } | undefined;
      if (status === 409 || status === 422) {
        throw new CheckoutInvalidStateError(
          body?.code ?? 'CHECKOUT_INVALID',
          body?.message ?? 'Checkout failed',
        );
      }
    }
    throw err;
  }
}
