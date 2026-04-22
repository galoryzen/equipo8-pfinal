import { useCallback, useEffect, useRef, useState } from 'react';

import { getBookingDetail } from '@src/services/booking-service';
import type { BookingDetail } from '@src/types/booking';

export type PaymentPollingStatus =
  | 'idle'
  | 'processing'
  | 'authorized'
  | 'failed'
  | 'expired'
  | 'timeout';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30_000;

interface State {
  status: PaymentPollingStatus;
  bookingDetail: BookingDetail | null;
}

/**
 * Polls `GET /bookings/{id}` after a `/checkout` call to wait for the async
 * payment flow to resolve. Resolves to `authorized` once status leaves
 * PENDING_PAYMENT to PENDING_CONFIRMATION/CONFIRMED, `failed` on REJECTED,
 * `expired` if the hold ran out, `timeout` after POLL_TIMEOUT_MS without
 * transition. Timers are cleaned up on unmount and on stopPolling().
 */
export function usePaymentPolling() {
  const [state, setState] = useState<State>({ status: 'idle', bookingDetail: null });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    clearTimers();
    setState((prev) => (prev.status === 'processing' ? { ...prev, status: 'idle' } : prev));
  }, [clearTimers]);

  const startPolling = useCallback(
    (bookingId: string) => {
      clearTimers();
      setState({ status: 'processing', bookingDetail: null });

      const tick = async () => {
        try {
          const detail = await getBookingDetail(bookingId);
          if (detail.status === 'PENDING_CONFIRMATION' || detail.status === 'CONFIRMED') {
            clearTimers();
            setState({ status: 'authorized', bookingDetail: detail });
            return;
          }
          if (detail.status === 'REJECTED') {
            clearTimers();
            setState({ status: 'failed', bookingDetail: detail });
            return;
          }
          if (detail.status === 'EXPIRED' || detail.status === 'CANCELLED') {
            clearTimers();
            setState({ status: 'expired', bookingDetail: detail });
            return;
          }
          setState((prev) => ({ ...prev, bookingDetail: detail }));
        } catch {
          // Swallow transient errors and keep polling; timeout will catch
          // persistent failures.
        }
      };

      void tick();
      intervalRef.current = setInterval(() => {
        void tick();
      }, POLL_INTERVAL_MS);
      timeoutRef.current = setTimeout(() => {
        clearTimers();
        setState((prev) => ({ ...prev, status: 'timeout' }));
      }, POLL_TIMEOUT_MS);
    },
    [clearTimers],
  );

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    status: state.status,
    bookingDetail: state.bookingDetail,
    startPolling,
    stopPolling,
  };
}
