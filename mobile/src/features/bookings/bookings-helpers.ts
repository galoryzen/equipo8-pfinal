import type { BookingDetail } from '@src/types/booking';

const PAST_STATUSES = new Set(['CONFIRMED', 'CANCELLED', 'REJECTED']);

const STATUS_KEYS: Record<string, string> = {
  CONFIRMED: 'trips.status.confirmed',
  PENDING_PAYMENT: 'trips.status.pendingPayment',
  PENDING_CONFIRMATION: 'trips.status.pendingConfirmation',
  CANCELLED: 'trips.status.cancelled',
  REJECTED: 'trips.status.rejected',
};

export function formatBookingCode(id: string): string {
  const compact = id.replace(/-/g, '');
  return `#${compact.slice(0, 8).toUpperCase()}`;
}

export function statusI18nKey(status: string): string {
  return STATUS_KEYS[status] ?? 'trips.status.confirmed';
}

export function isPastBookingForRebook(
  detail: Pick<BookingDetail, 'status' | 'checkout'>,
  today: Date,
): boolean {
  if (!PAST_STATUSES.has(detail.status)) return false;
  if (detail.status === 'CANCELLED' || detail.status === 'REJECTED') return true;
  const checkoutDate = new Date(detail.checkout);
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return checkoutDate < todayMidnight;
}
