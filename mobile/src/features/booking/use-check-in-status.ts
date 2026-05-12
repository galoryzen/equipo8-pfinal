import { useEffect, useRef, useState } from 'react';

import { getBookingDetail } from '@src/services/booking-service';
import type { BookingDetail } from '@src/types/booking';

const POLL_INTERVAL_MS = 5_000;

export type CheckInPollingStatus =
  | 'loading'
  | 'ready'
  | 'checked_in'
  | 'cancelled'
  | 'error';

export interface CheckInPollingState {
  status: CheckInPollingStatus;
  bookingDetail: BookingDetail | null;
  error: Error | null;
}

/**
 * Polls `GET /bookings/{id}` while the traveler holds the check-in QR open.
 * Settles into `checked_in` as soon as the hotel calls the check-in endpoint
 * (status transitions CONFIRMED → CHECKED_IN). No hard timeout: the screen
 * keeps polling for as long as it stays mounted, since the traveler may be
 * waiting at the desk for several minutes. Transient fetch failures are
 * tolerated as long as we already have a cached detail; otherwise we surface
 * `error` so the screen can render a retry hint.
 */
export function useCheckInStatus(bookingId: string | undefined): CheckInPollingState {
  const [state, setState] = useState<CheckInPollingState>({
    status: 'loading',
    bookingDetail: null,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;

    const clear = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const tick = async () => {
      try {
        const detail = await getBookingDetail(bookingId);
        if (cancelled) return;
        if (detail.status === 'CHECKED_IN' || detail.status === 'CHECKED_OUT') {
          clear();
          setState({ status: 'checked_in', bookingDetail: detail, error: null });
          return;
        }
        if (detail.status === 'CANCELLED' || detail.status === 'REJECTED') {
          clear();
          setState({ status: 'cancelled', bookingDetail: detail, error: null });
          return;
        }
        setState({ status: 'ready', bookingDetail: detail, error: null });
      } catch (err) {
        if (cancelled) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        setState((prev) => ({
          status: prev.bookingDetail ? prev.status : 'error',
          bookingDetail: prev.bookingDetail,
          error: wrapped,
        }));
      }
    };

    void tick();
    intervalRef.current = setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clear();
    };
  }, [bookingId]);

  return state;
}
