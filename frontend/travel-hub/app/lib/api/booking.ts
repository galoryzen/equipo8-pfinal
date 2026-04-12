import type { BookingDetail, BookingListItem } from '@/app/lib/types/booking';

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
