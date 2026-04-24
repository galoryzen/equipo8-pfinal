import { EMPTY_DASHBOARD_DATA } from '@/app/lib/api/dashboard';
import { useDashboardData } from '@/app/manager/hooks/useDashboardData';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('useDashboardData', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts loading and then returns success data with normalized values', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          metrics: {
            totalBookings: { value: 10, variation: 1 },
            revenue: { value: null, variation: 2 },
            occupancyRate: { value: '80', variation: 0 },
            averageRating: { value: 4.8, variation: -0.3 },
          },
          bookingTrends: [{ date: '2026-01-01', bookings: 1 }],
          recentActivity: [
            { type: 'BOOKING_CREATED', description: 'ok', timestamp: '2026-01-01T00:00:00Z' },
          ],
          upcomingCheckins: [
            {
              guest: 'Laura',
              roomType: 'Suite',
              checkIn: '2026-01-02',
              checkOut: '2026-01-05',
              status: 'CONFIRMED',
              amount: '300',
            },
          ],
        }),
    } as Response);

    const { result, rerender } = renderHook(({ from, to }) => useDashboardData(from, to), {
      initialProps: { from: '2026-01-01', to: '2026-01-31' },
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(EMPTY_DASHBOARD_DATA);

    await waitFor(() => expect(result.current.loading).toBe(false));

    const firstUrl = String(vi.mocked(global.fetch).mock.calls[0]?.[0]);
    expect(firstUrl).toContain('/api/v1/dashboard/metrics?');
    expect(firstUrl).toContain('from=2026-01-01');
    expect(firstUrl).toContain('to=2026-01-31');
    expect(result.current.data.metrics.revenue.value).toBe(0);

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await act(async () => {
      rerender({ from: '2026-02-01', to: '2026-02-28' });
    });
    await waitFor(() => expect(vi.mocked(global.fetch).mock.calls.length).toBe(2));

    const secondUrl = String(vi.mocked(global.fetch).mock.calls[1]?.[0]);
    expect(secondUrl).toContain('from=2026-02-01');
    expect(secondUrl).toContain('to=2026-02-28');
  });

  it('sets unauthorized error when API returns 403', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ detail: 'Forbidden dashboard' }),
    } as Response);

    const { result } = renderHook(() => useDashboardData('2026-03-01', '2026-03-31'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(EMPTY_DASHBOARD_DATA);
    expect(result.current.error).toEqual({
      status: 403,
      message: 'Forbidden dashboard',
      kind: 'unauthorized',
    });
  });

  it('sets network error when fetch throws', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useDashboardData('2026-04-01', '2026-04-30'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(EMPTY_DASHBOARD_DATA);
    expect(result.current.error).toEqual({
      message: 'Error loading dashboard',
      kind: 'network',
    });
  });
});
