import axios from 'axios';

import { api } from '@src/services/api';
import type {
  BookingDetail,
  BookingListItem,
  CartBooking,
  CreateCartBookingPayload,
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
