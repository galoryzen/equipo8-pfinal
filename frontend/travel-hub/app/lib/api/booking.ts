import { formatApiErrorBody } from '@/app/lib/api/catalog';
import { API_URL } from '@/app/lib/api/constants';
import type {
  BookingDetail,
  BookingListItem,
  CartBooking,
  CreateCartBookingPayload,
  GuestPayload,
  PaginatedResponse,
  PendingConfirmationBookingItem,
  RefundDetail,
} from '@/app/lib/types/booking';

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
  if (body && typeof body === 'object') {
    const msg = 'message' in body ? String((body as { message: unknown }).message) : '';
    const code = 'code' in body ? String((body as { code: unknown }).code) : '';
    if (msg) return code ? `${msg} (${code})` : msg;
  }
  return formatApiErrorBody(body, res.status);
}

/** Thrown by partner list/export when the booking API returns a non-OK status. */
export class BookingApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'BookingApiError';
    this.status = status;
  }
}

export interface HotelBookingsMetrics {
  confirmedCount: number;
  pendingCount: number;
  checkInsTodayCount: number;
  cancelledCount: number;
}

/** Hotel-wide aggregates for the manager Bookings stat cards (not paginated). */
export async function fetchHotelBookingsMetrics(isAdmin = false): Promise<HotelBookingsMetrics> {
  const endpoint = isAdmin
    ? `${API_URL}/api/v1/booking/dashboard/admin/bookings-metrics`
    : `${API_URL}/api/v1/booking/dashboard/bookings-metrics`;
  const res = await fetch(endpoint, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<HotelBookingsMetrics>;
}

export type PartnerBookingsListFilters = {
  page?: number;
  page_size?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  room_type_id?: string;
  q?: string;
};

export type PartnerBookingsExportFilters = Omit<PartnerBookingsListFilters, 'page' | 'page_size'>;

function appendPartnerBookingQuery(params: URLSearchParams, options?: PartnerBookingsListFilters) {
  const page = options?.page ?? 1;
  const page_size = options?.page_size ?? 10;
  params.set('page', String(page));
  params.set('page_size', String(page_size));
  if (options?.status) params.set('status', options.status);
  if (options?.date_from) params.set('date_from', options.date_from);
  if (options?.date_to) params.set('date_to', options.date_to);
  if (options?.room_type_id) params.set('room_type_id', options.room_type_id);
  const q = options?.q?.trim();
  if (q) params.set('q', q);
}

/**
 * Lists bookings for the current session: traveler (own), hotel partner (property
 * scope), or admin (all) — same `/bookings` route, role resolved by the gateway.
 */
export async function listPartnerBookings(
  options?: PartnerBookingsListFilters
): Promise<PaginatedResponse<BookingListItem>> {
  const params = new URLSearchParams();
  appendPartnerBookingQuery(params, options);
  const res = await fetch(`${API_URL}/api/v1/booking/bookings?${params}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new BookingApiError(await readErrorMessage(res), res.status);
  }
  return res.json();
}

function parseContentDispositionFilename(disposition: string | null): string | null {
  if (!disposition) return null;
  const star = /filename\*=(?:UTF-8'')?([^;\n]+)/i.exec(disposition);
  if (star?.[1]) return decodeURIComponent(star[1].trim().replace(/^["']|["']$/g, ''));
  const quoted = /filename="([^"]+)"/i.exec(disposition);
  if (quoted?.[1]) return quoted[1].trim();
  const plain = /filename=([^;\n]+)/i.exec(disposition);
  if (plain?.[1]) return plain[1].trim().replace(/^["']|["']$/g, '');
  return null;
}

/** Fetches CSV bytes and suggested filename (from Content-Disposition when present). */
export async function fetchPartnerBookingsExportBlob(
  filters?: PartnerBookingsExportFilters
): Promise<{ blob: Blob; filename: string }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);
  if (filters?.room_type_id) params.set('room_type_id', filters.room_type_id);
  const q = filters?.q?.trim();
  if (q) params.set('q', q);
  const qs = params.toString();
  const res = await fetch(`${API_URL}/api/v1/booking/bookings/export${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new BookingApiError(await readErrorMessage(res), res.status);
  }
  const blob = await res.blob();
  const filename =
    parseContentDispositionFilename(res.headers.get('Content-Disposition')) ??
    'travelhub-bookings-history.csv';
  return { blob, filename };
}

/** Triggers a browser download for a CSV blob (client-only). */
export function triggerCsvDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/** Hotel partner export: same filters as list, without pagination query params. */
export async function exportPartnerBookingsCsv(
  filters?: PartnerBookingsExportFilters
): Promise<void> {
  const { blob, filename } = await fetchPartnerBookingsExportBlob(filters);
  triggerCsvDownload(blob, filename);
}

/**
 * Lists bookings for the authenticated traveler (cookie `access_token`, same origin).
 */
export async function getMyBookings(
  page = 1,
  pageSize = 10,
  status?: string
): Promise<PaginatedResponse<BookingListItem>> {
  return listPartnerBookings({ page, page_size: pageSize, status });
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

export async function cancelBooking(bookingId: string): Promise<BookingDetail> {
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

export async function abandonCart(bookingId: string): Promise<BookingDetail> {
  const res = await fetch(
    `${API_URL}/api/v1/booking/bookings/${encodeURIComponent(bookingId)}/abandon-cart`,
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

export async function getRefundByBookingId(bookingId: string): Promise<RefundDetail | null> {
  const res = await fetch(`${API_URL}/api/v1/payment/by-booking/${encodeURIComponent(bookingId)}`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  return (await res.json()) ?? null;
}
