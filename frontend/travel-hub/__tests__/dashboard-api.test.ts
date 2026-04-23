import {
  DashboardFetchError,
  EMPTY_DASHBOARD_DATA,
  getHotelDashboardMetrics,
} from '@/app/lib/api/dashboard';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('dashboard API', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps /metrics response to normalized dashboard data', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          metrics: {
            totalBookings: { value: '25', variation: '5.4' },
            revenue: { value: null, variation: -2 },
            occupancyRate: { value: '78.9', variation: 'abc' },
            averageRating: { value: 4.6, variation: 0.5 },
          },
          bookingTrends: [
            { date: '2026-01-10', bookings: 10.4 },
            { date: '', bookings: 3 },
            { date: '2026-01-11', bookings: -5 },
          ],
          recentActivity: [
            {
              type: 'BOOKING_CREATED',
              description: 'Nueva reserva',
              timestamp: '2026-01-10T10:00:00Z',
            },
            { type: 'BOOKING_CANCELLED', description: '', timestamp: '2026-01-10T11:00:00Z' },
          ],
          upcomingCheckins: [
            {
              guest: 'Ana',
              roomType: 'Suite',
              checkIn: '2026-01-12',
              checkOut: '2026-01-15',
              status: 'CONFIRMED',
              amount: '123.45',
            },
            {
              guest: 'Pedro',
              roomType: '',
              checkIn: '2026-01-13',
              checkOut: '2026-01-16',
              status: 'CONFIRMED',
              amount: 40,
            },
          ],
        }),
    } as Response);

    const result = await getHotelDashboardMetrics('2026-01-01', '2026-01-31');

    expect(result.metrics.totalBookings).toEqual({ value: 25, variation: 5.4 });
    expect(result.metrics.revenue).toEqual({ value: 0, variation: -2 });
    expect(result.metrics.occupancyRate).toEqual({ value: 78.9, variation: 0 });
    expect(result.bookingTrends).toEqual([
      { date: '2026-01-10', bookings: 10 },
      { date: '2026-01-11', bookings: 0 },
    ]);
    expect(result.recentActivity).toEqual([
      {
        type: 'BOOKING_CREATED',
        description: 'Nueva reserva',
        timestamp: '2026-01-10T10:00:00Z',
      },
    ]);
    expect(result.upcomingCheckins).toEqual([
      {
        guest: 'Ana',
        roomType: 'Suite',
        checkIn: '2026-01-12',
        checkOut: '2026-01-15',
        status: 'CONFIRMED',
        amount: 123.45,
      },
    ]);
  });

  it('returns empty normalized structure for empty payload', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await getHotelDashboardMetrics('2026-02-01', '2026-02-28');
    expect(result).toEqual(EMPTY_DASHBOARD_DATA);
  });

  it('throws unauthorized error when API responds 403', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ detail: 'Forbidden dashboard' }),
    } as Response);

    await expect(getHotelDashboardMetrics('2026-03-01', '2026-03-31')).rejects.toMatchObject({
      name: 'DashboardFetchError',
      status: 403,
      kind: 'unauthorized',
      message: 'Forbidden dashboard',
    } satisfies Partial<DashboardFetchError>);
  });

  it('throws network error when request fails', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('network down'));

    await expect(getHotelDashboardMetrics('2026-04-01', '2026-04-30')).rejects.toMatchObject({
      name: 'DashboardFetchError',
      kind: 'network',
      message: 'Error loading dashboard',
    } satisfies Partial<DashboardFetchError>);
  });
});
