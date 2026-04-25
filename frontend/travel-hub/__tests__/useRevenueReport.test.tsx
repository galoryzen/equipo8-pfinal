import * as reportsApi from '@/app/lib/api/reports';
import { useRevenueReport } from '@/app/manager/hooks/useRevenueReport';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('useRevenueReport', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads report and exposes normalized data', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          kpis: {
            totalRevenue: { value: 100, variation: 0 },
            adr: { value: 50, variation: 0 },
            occupancyRate: { value: 0.8, variation: 0 },
          },
          trends: [],
          revenueByRoomType: [],
          totalAggregatedRevenue: 100,
          metadata: { from: '2026-01-01', to: '2026-01-31', currency: 'USD' },
        }),
    } as Response);

    const { result } = renderHook(() => useRevenueReport());

    expect(result.current.loading).toBe(false);
    expect(result.current.hasLoaded).toBe(false);

    await act(async () => {
      await result.current.generateReport({
        from: '2026-01-01',
        to: '2026-01-31',
        hotelId: 'hotel-1',
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.hasLoaded).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.data.totalAggregatedRevenue).toBe(100);
  });

  it('sets unauthorized error when API returns 403', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ detail: 'Forbidden' }),
    } as Response);

    const { result } = renderHook(() => useRevenueReport());

    await act(async () => {
      await result.current.generateReport({
        from: '2026-02-01',
        to: '2026-02-28',
        hotelId: 'hotel-1',
      });
    });

    expect(result.current.data).toEqual(reportsApi.EMPTY_REVENUE_REPORT_DATA);
    expect(result.current.error).toEqual({
      status: 403,
      message: 'Forbidden',
      kind: 'unauthorized',
    });
  });

  it('sets network error when fetch throws', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useRevenueReport());

    await act(async () => {
      await result.current.generateReport({
        from: '2026-03-01',
        to: '2026-03-31',
        hotelId: 'hotel-1',
      });
    });

    expect(result.current.error).toEqual({
      message: 'Error loading revenue report',
      kind: 'network',
    });
  });

  it('clears previous error on a new successful run', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'fail' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            kpis: {
              totalRevenue: { value: 1, variation: 0 },
              adr: { value: 1, variation: 0 },
              occupancyRate: { value: 1, variation: 0 },
            },
            trends: [],
            revenueByRoomType: [],
            totalAggregatedRevenue: 1,
            metadata: { from: '', to: '', currency: 'USD' },
          }),
      } as Response);

    const { result } = renderHook(() => useRevenueReport());

    await act(async () => {
      await result.current.generateReport({
        from: '2026-04-01',
        to: '2026-04-30',
        hotelId: 'hotel-1',
      });
    });
    expect(result.current.error?.kind).toBe('server');

    await act(async () => {
      await result.current.generateReport({
        from: '2026-04-01',
        to: '2026-04-30',
        hotelId: 'hotel-1',
      });
    });

    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.data.totalAggregatedRevenue).toBe(1);
  });

  it('maps a generic Error from getRevenueReport to a network-shaped error', async () => {
    vi.spyOn(reportsApi, 'getRevenueReport').mockRejectedValueOnce(new Error('wrapped'));

    const { result } = renderHook(() => useRevenueReport());

    await act(async () => {
      await result.current.generateReport({
        from: '2026-05-01',
        to: '2026-05-31',
        hotelId: 'hotel-1',
      });
    });

    expect(result.current.error).toEqual({
      message: 'wrapped',
      kind: 'network',
    });
  });

  it('maps a non-Error rejection to the default message', async () => {
    vi.spyOn(reportsApi, 'getRevenueReport').mockRejectedValueOnce('not-an-error');

    const { result } = renderHook(() => useRevenueReport());

    await act(async () => {
      await result.current.generateReport({
        from: '2026-06-01',
        to: '2026-06-30',
        hotelId: 'hotel-1',
      });
    });

    expect(result.current.error).toEqual({
      message: 'Error loading revenue report',
      kind: 'network',
    });
  });
});
