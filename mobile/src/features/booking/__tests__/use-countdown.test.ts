import { renderHook, act } from '@testing-library/react-native';

import { useCountdown } from '@src/features/booking/use-countdown';

const NOW_MS = new Date('2026-04-18T20:00:00Z').getTime();

describe('useCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW_MS });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 00:00 and expired=true when expiresAtIso is null', () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current.expired).toBe(true);
    expect(result.current.label).toBe('00:00');
    expect(result.current.remainingMs).toBe(0);
  });

  it('returns label in mm:ss for a future expiry', () => {
    // +5 minutes and 3 seconds from NOW_MS.
    const { result } = renderHook(() => useCountdown('2026-04-18T20:05:03Z'));
    expect(result.current.expired).toBe(false);
    expect(result.current.label).toBe('05:03');
  });

  it('normalizes naive UTC timestamps (no Z)', () => {
    const { result } = renderHook(() => useCountdown('2026-04-18T20:02:00'));
    expect(result.current.label).toBe('02:00');
    expect(result.current.expired).toBe(false);
  });

  it('updates label as time passes', () => {
    const { result } = renderHook(() => useCountdown('2026-04-18T20:02:00Z'));
    expect(result.current.label).toBe('02:00');

    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.label).toBe('01:00');

    act(() => {
      jest.advanceTimersByTime(55_000);
    });
    expect(result.current.label).toBe('00:05');
  });

  it('transitions to expired=true once the timestamp has passed', () => {
    const { result } = renderHook(() => useCountdown('2026-04-18T20:00:10Z'));
    expect(result.current.expired).toBe(false);

    act(() => {
      jest.advanceTimersByTime(15_000);
    });
    expect(result.current.expired).toBe(true);
    expect(result.current.label).toBe('00:00');
  });

  it('returns 00:00 immediately for a past timestamp', () => {
    const { result } = renderHook(() => useCountdown('2026-04-18T19:00:00Z'));
    expect(result.current.expired).toBe(true);
    expect(result.current.label).toBe('00:00');
  });
});
