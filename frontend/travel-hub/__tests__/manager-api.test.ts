import {
  createPromotion,
  deletePromotion,
  getHotelMetrics,
  getHotelRoomTypes,
  getManagerHotels,
  getRatePlanCancellationPolicy,
  getRoomTypePromotion,
  updateRatePlanCancellationPolicy,
} from '@/app/lib/api/manager';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE = 'https://api.travelhub.galoryzen.xyz';

describe('manager API', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getManagerHotels requests paginated manager hotels with credentials', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [],
          total: 0,
          page: 1,
          page_size: 100,
          total_pages: 0,
        }),
    } as Response);

    await getManagerHotels(2, 50);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/catalog/manager/hotels?page=2&page_size=50`,
      { credentials: 'include' }
    );
  });

  it('getHotelMetrics hits property metrics endpoint', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          occupancyRate: 0.5,
          activeBookings: 3,
          monthlyRevenue: 1000,
        }),
    } as Response);

    const out = await getHotelMetrics('prop-1');
    expect(out.monthlyRevenue).toBe(1000);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/catalog/manager/hotels/prop-1/metrics`,
      { credentials: 'include' }
    );
  });

  it('getHotelRoomTypes requests room types for a property', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [],
          total: 0,
          page: 1,
          page_size: 100,
          total_pages: 0,
        }),
    } as Response);

    await getHotelRoomTypes('prop-1', 1, 20);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/catalog/manager/hotels/prop-1/room-types?page=1&page_size=20`,
      { credentials: 'include' }
    );
  });

  it('getRoomTypePromotion returns JSON body', async () => {
    const promo = {
      id: 'p1',
      rate_plan_id: 'rp1',
      name: 'Sale',
      discount_type: 'PERCENT' as const,
      discount_value: 10,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      is_active: true,
    };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(promo),
    } as Response);

    const out = await getRoomTypePromotion('rt-1');
    expect(out).toEqual(promo);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/catalog/manager/room-types/rt-1/promotion`,
      { credentials: 'include' }
    );
  });

  it('deletePromotion sends DELETE', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await deletePromotion('promo-9');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/catalog/manager/promotions/promo-9`,
      { method: 'DELETE', credentials: 'include' }
    );
  });

  it('createPromotion POSTs JSON payload', async () => {
    const created = {
      id: 'new',
      name: 'Summer',
      discount_type: 'PERCENT',
      discount_value: 15,
      start_date: '2026-06-01',
      end_date: '2026-06-30',
      is_active: true,
    };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(created),
    } as Response);

    const payload = {
      rate_plan_id: 'rp-1',
      name: 'Summer',
      discount_type: 'PERCENT' as const,
      discount_value: 15,
      start_date: '2026-06-01',
      end_date: '2026-06-30',
    };

    const out = await createPromotion('hotel-1', payload);
    expect(out).toEqual(created);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/catalog/manager/hotels/hotel-1/promotions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      }
    );
  });

  it('getRatePlanCancellationPolicy fetches policy document', async () => {
    const policy = { type: 'FULL' as const, refund_percent: null, hours_limit: 48 };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(policy),
    } as Response);

    const out = await getRatePlanCancellationPolicy('rp-99');
    expect(out).toEqual(policy);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/catalog/manager/rate-plans/rp-99/cancellation-policy`,
      { credentials: 'include' }
    );
  });

  it('updateRatePlanCancellationPolicy PATCHes payload', async () => {
    const updated = { type: 'PARTIAL' as const, refund_percent: 50, hours_limit: 24 };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updated),
    } as Response);

    const out = await updateRatePlanCancellationPolicy('rp-99', {
      type: 'PARTIAL',
      refund_percent: 50,
    });
    expect(out).toEqual(updated);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/catalog/manager/rate-plans/rp-99/cancellation-policy`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'PARTIAL', refund_percent: 50 }),
      }
    );
  });

  it('throws with FastAPI detail string on error', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Invalid discount' }),
    } as Response);

    await expect(createPromotion('h1', {} as never)).rejects.toThrow('Invalid discount');
  });
});
