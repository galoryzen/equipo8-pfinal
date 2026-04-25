import {
  EMPTY_REVENUE_REPORT_DATA,
  RevenueReportFetchError,
  getRevenueReport,
} from '@/app/lib/api/reports';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('reports API', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes empty revenue report defaults', () => {
    expect(EMPTY_REVENUE_REPORT_DATA.kpis.totalRevenue).toEqual({ value: 0, variation: 0 });
    expect(EMPTY_REVENUE_REPORT_DATA.trends).toEqual([]);
    expect(EMPTY_REVENUE_REPORT_DATA.metadata.currency).toBe('USD');
  });

  it('throws server error when hotel_id is missing', async () => {
    await expect(
      getRevenueReport({ from: '2026-01-01', to: '2026-01-31', hotelId: '   ' })
    ).rejects.toMatchObject({
      name: 'RevenueReportFetchError',
      kind: 'server',
      message: 'Missing hotel_id for revenue report',
    } satisfies Partial<RevenueReportFetchError>);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maps revenue-report response with normalization', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          kpis: {
            totalRevenue: { value: '1200', variation: '5' },
            adr: { value: null, variation: 'x' },
            occupancyRate: { value: 0.7, variation: -1 },
          },
          trends: [
            { date: '2026-01-01', revenue: '100', occupancyRate: '0.5' },
            { date: '', revenue: 1, occupancyRate: 1 },
            null,
            'not-an-object',
          ],
          revenueByRoomType: [
            {
              roomType: 'Suite',
              unitsSold: '2.7',
              avgRate: '99.5',
              totalRevenue: '199',
            },
            { roomType: '', unitsSold: 1, avgRate: 1, totalRevenue: 1 },
          ],
          totalAggregatedRevenue: '500',
          metadata: { from: '2026-01-01', to: '2026-01-31', currency: 'COP' },
        }),
    } as Response);

    const result = await getRevenueReport({
      from: '2026-01-01',
      to: '2026-01-31',
      hotelId: 'hotel-1',
    });

    const url = String(vi.mocked(global.fetch).mock.calls[0]?.[0]);
    expect(url).toContain('/api/v1/booking/dashboard/revenue-report?');
    expect(url).toContain('hotel_id=hotel-1');
    expect(url).toContain('from=2026-01-01');
    expect(url).toContain('to=2026-01-31');

    expect(result.kpis.totalRevenue).toEqual({ value: 1200, variation: 5 });
    expect(result.kpis.adr).toEqual({ value: 0, variation: 0 });
    expect(result.kpis.occupancyRate).toEqual({ value: 0.7, variation: -1 });
    expect(result.trends).toEqual([{ date: '2026-01-01', revenue: 100, occupancyRate: 0.5 }]);
    expect(result.revenueByRoomType).toEqual([
      { roomType: 'Suite', unitsSold: 3, avgRate: 99.5, totalRevenue: 199 },
    ]);
    expect(result.totalAggregatedRevenue).toBe(500);
    expect(result.metadata).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
      currency: 'COP',
    });
  });

  it('returns normalized defaults for empty success payload', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await getRevenueReport({
      from: '2026-02-01',
      to: '2026-02-28',
      hotelId: 'h1',
    });

    expect(result.kpis.totalRevenue).toEqual({ value: 0, variation: 0 });
    expect(result.metadata.from).toBe('');
    expect(result.metadata.currency).toBe('USD');
  });

  it('throws unauthorized error when API responds 403', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ detail: 'Forbidden report' }),
    } as Response);

    await expect(
      getRevenueReport({ from: '2026-03-01', to: '2026-03-31', hotelId: 'h1' })
    ).rejects.toMatchObject({
      name: 'RevenueReportFetchError',
      status: 403,
      kind: 'unauthorized',
      message: 'Forbidden report',
    } satisfies Partial<RevenueReportFetchError>);
  });

  it('throws server error with status text when detail is missing', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({}),
    } as Response);

    await expect(
      getRevenueReport({ from: '2026-04-01', to: '2026-04-30', hotelId: 'h1' })
    ).rejects.toMatchObject({
      name: 'RevenueReportFetchError',
      status: 502,
      kind: 'server',
      message: 'Error 502',
    } satisfies Partial<RevenueReportFetchError>);
  });

  it('throws server error when error body json fails', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('bad json')),
    } as Response);

    await expect(
      getRevenueReport({ from: '2026-05-01', to: '2026-05-31', hotelId: 'h1' })
    ).rejects.toMatchObject({
      kind: 'server',
      message: 'Error 500',
    } satisfies Partial<RevenueReportFetchError>);
  });

  it('throws network error when fetch throws', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('offline'));

    await expect(
      getRevenueReport({ from: '2026-06-01', to: '2026-06-30', hotelId: 'h1' })
    ).rejects.toMatchObject({
      name: 'RevenueReportFetchError',
      kind: 'network',
      message: 'Error loading revenue report',
    } satisfies Partial<RevenueReportFetchError>);
  });

  it('throws network error when success json fails', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error('parse')),
    } as Response);

    await expect(
      getRevenueReport({ from: '2026-07-01', to: '2026-07-31', hotelId: 'h1' })
    ).rejects.toMatchObject({
      kind: 'network',
      message: 'Error loading revenue report',
    } satisfies Partial<RevenueReportFetchError>);
  });
});
