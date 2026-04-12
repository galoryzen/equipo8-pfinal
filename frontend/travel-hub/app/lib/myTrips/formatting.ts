import { format, parseISO, startOfDay, isBefore } from 'date-fns';

import type { BookingListItem } from '@/app/lib/types/booking';
import type { PropertyDetail } from '@/app/lib/types/catalog';

export function formatTripDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'MMM d, yyyy');
  } catch {
    return isoDate;
  }
}

/** Short reference for UI, e.g. Ref: #A1B2C3D4 */
export function formatBookingRef(bookingId: string): string {
  const compact = bookingId.replace(/-/g, '');
  const tail = compact.slice(-8).toUpperCase();
  return `Ref: #${tail}`;
}

export function estimateGuestLabel(
  booking: BookingListItem,
  property: PropertyDetail | null | undefined
): string | null {
  if (!property?.room_types?.length) return null;
  let total = 0;
  for (const item of booking.items) {
    const rt = property.room_types.find((r) => r.id === item.room_type_id);
    if (rt) total += rt.capacity * item.quantity;
  }
  if (total <= 0) return null;
  return `${total} Guest${total === 1 ? '' : 's'}`;
}

export function primaryPropertyId(booking: BookingListItem): string | null {
  return booking.items[0]?.property_id ?? null;
}

export function getPrimaryRoomLabel(
  booking: BookingListItem,
  property: PropertyDetail | null | undefined
): string | null {
  const first = booking.items[0];
  if (!first) return null;
  const rt = property?.room_types?.find((r) => r.id === first.room_type_id);
  return rt?.name ?? null;
}

export function isPastTrip(checkoutIso: string): boolean {
  try {
    return isBefore(startOfDay(parseISO(checkoutIso)), startOfDay(new Date()));
  } catch {
    return false;
  }
}

export function splitUpcomingPast(bookings: BookingListItem[]): {
  upcoming: BookingListItem[];
  past: BookingListItem[];
} {
  const upcoming: BookingListItem[] = [];
  const past: BookingListItem[] = [];
  for (const b of bookings) {
    if (isPastTrip(b.checkout)) past.push(b);
    else upcoming.push(b);
  }
  return { upcoming, past };
}
