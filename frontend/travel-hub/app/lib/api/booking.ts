import type {
  BookingDetail,
  BookingListItem,
  CartBooking,
  CreateCartBookingPayload,
  GuestPayload,
  PaginatedResponse,
  PendingConfirmationBookingItem,
} from '@/app/lib/types/booking';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.travelhub.galoryzen.xyz';

async function readErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body === 'object' && 'message' in body) {
    return String((body as { message: unknown }).message);
  }
  return `Error ${res.status}`;
}

/**
 * Lists bookings for the authenticated traveler (cookie `access_token`, same origin).
 */
export async function getMyBookings(
  page = 1,
  pageSize = 10
): Promise<PaginatedResponse<BookingListItem>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const res = await fetch(`${API_URL}/api/v1/booking/bookings?${params}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json();
}

export async function getBookingDetail(bookingId: string): Promise<BookingDetail> {
  const res = await fetch(`${API_URL}/api/v1/booking/bookings/${encodeURIComponent(bookingId)}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json();
}

export class CartConflictError extends Error {
  existingBookingId: string;
  constructor(message: string, existingBookingId: string) {
    super(message);
    this.name = 'CartConflictError';
    this.existingBookingId = existingBookingId;
  }
}

export class RateUnavailableError extends Error {
  constructor(message = 'Rates are not available for the selected dates.') {
    super(message);
    this.name = 'RateUnavailableError';
  }
}

export async function createCartBooking(payload: CreateCartBookingPayload): Promise<CartBooking> {
  const res = await fetch(`${API_URL}/api/v1/booking/bookings`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (body?.code === 'CART_ALREADY_EXISTS' && typeof body.existing_booking_id === 'string') {
      throw new CartConflictError(String(body.message), body.existing_booking_id);
    }
    if (body?.code === 'RATE_UNAVAILABLE') {
      throw new RateUnavailableError();
    }
    throw new Error(body && 'message' in body ? String(body.message) : `Error ${res.status}`);
  }
  return res.json();
}

export async function cancelCartBooking(bookingId: string): Promise<BookingDetail> {
  const res = await fetch(
    `${API_URL}/api/v1/booking/bookings/${encodeURIComponent(bookingId)}/cancel`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json();
}

export async function fetchPendingConfirmationBookings(
  page = 1,
  pageSize = 5
): Promise<PaginatedResponse<PendingConfirmationBookingItem>> {
  const params = new URLSearchParams({
    status: 'PENDING_CONFIRMATION',
    page: String(page),
    page_size: String(pageSize),
  });
  const res = await fetch(`${API_URL}/api/v1/booking/bookings?${params}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json();
}

export async function confirmBooking(bookingId: string): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/v1/booking/bookings/${encodeURIComponent(bookingId)}/confirm`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
}

export async function rejectBooking(bookingId: string): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/v1/booking/bookings/${encodeURIComponent(bookingId)}/reject`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
}

export async function saveBookingGuests(bookingId: string, guests: GuestPayload[]): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/v1/booking/bookings/${encodeURIComponent(bookingId)}/guests`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guests }),
    }
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
}

/**
 * Triggers the async payment flow on the backend. Pass `forceDecline=true` to
 * tag the PaymentRequested event so the mock PSP deterministically rejects —
 * the only way to exercise the failure path end-to-end without a real gateway.
 */
export async function checkoutBooking(
  bookingId: string,
  forceDecline = false
): Promise<BookingDetail> {
  const res = await fetch(
    `${API_URL}/api/v1/booking/bookings/${encodeURIComponent(bookingId)}/checkout`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_decline: forceDecline }),
    }
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json();
}
