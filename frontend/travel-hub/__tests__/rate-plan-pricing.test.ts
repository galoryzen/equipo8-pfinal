import { RateUnavailableError, createCartBooking } from '@/app/lib/api/booking';
import {
  RateUnavailableError as CatalogRateUnavailableError,
  getRatePlanPricing,
} from '@/app/lib/api/catalog';
import type { CreateCartBookingPayload } from '@/app/lib/types/booking';
import type { RatePlanPricing } from '@/app/lib/types/catalog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('getRatePlanPricing', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GETs the pricing endpoint with checkin/checkout params', async () => {
    const PRICING: RatePlanPricing = {
      rate_plan_id: 'rp1',
      currency_code: 'USD',
      nights: [
        { day: '2026-05-01', price: '140.00', original_price: null },
        { day: '2026-05-02', price: '150.00', original_price: null },
      ],
      subtotal: '290.00',
      original_subtotal: null,
      taxes: '29.00',
      service_fee: '14.50',
      total: '333.50',
    };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(PRICING),
    } as Response);

    const result = await getRatePlanPricing('rp1', '2026-05-01', '2026-05-03');

    const [url] = vi.mocked(global.fetch).mock.calls[0] as [string];
    expect(url).toMatch(
      /\/api\/v1\/catalog\/rate-plans\/rp1\/pricing\?checkin=2026-05-01&checkout=2026-05-03$/
    );
    expect(result.subtotal).toBe('290.00');
    expect(result.nights).toHaveLength(2);
    expect(result.nights[1].price).toBe('150.00');
  });

  it('throws RateUnavailableError on 409', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ code: 'RATE_UNAVAILABLE' }),
    } as Response);

    await expect(getRatePlanPricing('rp1', '2026-05-01', '2026-05-03')).rejects.toBeInstanceOf(
      CatalogRateUnavailableError
    );
  });
});

describe('createCartBooking with RATE_UNAVAILABLE', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const PAYLOAD: CreateCartBookingPayload = {
    checkin: '2026-05-01',
    checkout: '2026-05-03',
    currency_code: 'USD',
    property_id: 'p1',
    room_type_id: 'r1',
    rate_plan_id: 'rp1',
  };

  it('throws RateUnavailableError when backend returns 409 with RATE_UNAVAILABLE code', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ code: 'RATE_UNAVAILABLE', message: 'Rates not available' }),
    } as Response);

    await expect(createCartBooking(PAYLOAD)).rejects.toBeInstanceOf(RateUnavailableError);
  });
});
