import { formatApiErrorBody } from '@/app/lib/api/catalog';
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

/** HTTP error with status for hotel booking actions (check-in, etc.). */
export class ApiHttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.body = body;
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body === 'object' && 'message' in body) {
    return String((body as { message: unknown }).message);
  }
  return `Error ${res.status}`;
}

export interface HotelBookingsMetrics {
  confirmedCount: number;
  pendingCount: number;
  checkInsTodayCount: number;
  cancelledCount: number;
}

/** Hotel-wide aggregates for the manager Bookings stat cards (not paginated). */
export async function fetchHotelBookingsMetrics(): Promise<HotelBookingsMetrics> {
  const res = await fetch(`${API_URL}/api/v1/booking/dashboard/bookings-metrics`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<HotelBookingsMetrics>;
}

/**
 * Lists bookings for the current session: traveler (own), hotel partner (property
 * scope), or admin (all) — same `/bookings` route, role resolved by the gateway.
 */
export async function listPartnerBookings(options?: {
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<BookingListItem>> {
  const page = options?.page ?? 1;
  const page_size = options?.page_size ?? 10;
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(page_size),
  });
  if (options?.status) {
    params.set('status', options.status);
  }
  const res = await fetch(`${API_URL}/api/v1/booking/bookings?${params}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json();
}

/**
 * Lists bookings for the authenticated traveler (cookie `access_token`, same origin).
 */
export async function getMyBookings(
  page = 1,
  pageSize = 10
): Promise<PaginatedResponse<BookingListItem>> {
  return listPartnerBookings({ page, page_size: pageSize });
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

/** Registers physical guest check-in for a hotel booking (HOTEL / MANAGER roles). */
export async function registerGuestCheckIn(
  bookingId: string,
  payload: { actual_arrival_at: string }
): Promise<BookingDetail> {
  const res = await fetch(
    `${API_URL}/api/v1/booking/bookings/${encodeURIComponent(bookingId)}/check-in`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiHttpError(formatApiErrorBody(body, res.status), res.status, body);
  }
  return body as BookingDetail;
}

/** Registers physical guest check-out for a hotel booking (HOTEL / MANAGER roles). */
export async function registerBookingCheckOut(
  bookingId: string,
  payload: { actual_departure_at: string }
): Promise<BookingDetail> {
  const res = await fetch(
    `${API_URL}/api/v1/booking/bookings/${encodeURIComponent(bookingId)}/check-out`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiHttpError(formatApiErrorBody(body, res.status), res.status, body);
  }
  return body as BookingDetail;
}
