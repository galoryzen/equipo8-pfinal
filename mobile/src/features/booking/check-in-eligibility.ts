import type { BookingDetail } from '@src/types/booking';

const HOURS_BEFORE_CHECKIN_TO_SHOW_QR = 24;

function parseLocalMidnight(yyyyMmDd: string): Date {
  const [year, month, day] = yyyyMmDd.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function hoursUntilCheckIn(checkinDate: string, now: Date): number {
  const checkinMidnight = parseLocalMidnight(checkinDate);
  return (checkinMidnight.getTime() - now.getTime()) / 3_600_000;
}

export function canShowCheckInQr(
  booking: Pick<BookingDetail, 'status' | 'checkin' | 'checkout'>,
  now: Date,
): boolean {
  if (booking.status !== 'CONFIRMED') return false;
  if (hoursUntilCheckIn(booking.checkin, now) >= HOURS_BEFORE_CHECKIN_TO_SHOW_QR) {
    return false;
  }
  const startOfDayAfterCheckout = parseLocalMidnight(booking.checkout);
  startOfDayAfterCheckout.setDate(startOfDayAfterCheckout.getDate() + 1);
  return now.getTime() < startOfDayAfterCheckout.getTime();
}
