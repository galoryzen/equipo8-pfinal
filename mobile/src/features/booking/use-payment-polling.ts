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
 * payment flow to resolve. Resolves to:
 *  - `authorized` once status leaves PENDING_PAYMENT to PENDING_CONFIRMATION/CONFIRMED
 *  - `failed` when the booking surfaces a `last_payment_attempt` whose
 *    `occurred_at` is newer than this polling session's start (so a stale
 *    failure from a previous attempt is ignored when the user retries)
 *  - `expired` if the booking transitions to EXPIRED/CANCELLED
 *  - `timeout` after POLL_TIMEOUT_MS without any of the above
 *
 * REJECTED is intentionally NOT terminal here — that state is set by hotel
 * rejection of an already-confirmed booking, never during the payment window.
 *
 * Timers are cleaned up on unmount and on stopPolling().
 */
export function usePaymentPolling() {
  const [state, setState] = useState<State>({ status: 'idle', bookingDetail: null });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(0);

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
      // Anchor the session start so we only react to failures that happened
      // AFTER startPolling — guards against showing a stale decline from a
      // prior attempt the user already saw and corrected.
      startedAtRef.current = Date.now();
      setState({ status: 'processing', bookingDetail: null });

      const tick = async () => {
        try {
          const detail = await getBookingDetail(bookingId);
          if (detail.status === 'PENDING_CONFIRMATION' || detail.status === 'CONFIRMED') {
            clearTimers();
            setState({ status: 'authorized', bookingDetail: detail });
            return;
          }
          if (detail.status === 'EXPIRED' || detail.status === 'CANCELLED') {
            clearTimers();
            setState({ status: 'expired', bookingDetail: detail });
            return;
          }
          const lastFailure = detail.last_payment_attempt;
          if (lastFailure?.outcome === 'failed') {
            const occurredMs = Date.parse(lastFailure.occurred_at);
            if (Number.isFinite(occurredMs) && occurredMs >= startedAtRef.current) {
              clearTimers();
              setState({ status: 'failed', bookingDetail: detail });
              return;
            }
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
