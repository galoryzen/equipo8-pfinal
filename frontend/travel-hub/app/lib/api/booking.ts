import type {
  BookingDetail,
  BookingListItem,
  CartBooking,
  CreateCartBookingPayload,
  PendingConfirmationBookingItem,
  PendingConfirmationBookingsEnvelope,
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
export async function getMyBookings(): Promise<BookingListItem[]> {
  const res = await fetch(`${API_URL}/api/v1/booking/bookings`, {
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

export async function createCartBooking(payload: CreateCartBookingPayload): Promise<CartBooking> {
  const res = await fetch(`${API_URL}/api/v1/booking/bookings`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json();
}

export async function fetchPendingConfirmationBookings(): Promise<
  PendingConfirmationBookingItem[]
> {
  const res = await fetch(`${API_URL}/api/v1/booking/bookings?status=PENDING_CONFIRMATION`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  const data: unknown = await res.json();
  if (Array.isArray(data)) {
    return data as PendingConfirmationBookingItem[];
  }

  if (data && typeof data === 'object' && 'bookings' in data) {
    const envelope = data as PendingConfirmationBookingsEnvelope;
    if (Array.isArray(envelope.bookings)) {
      return envelope.bookings;
    }
  }

  throw new Error('Invalid pending bookings response format');
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
