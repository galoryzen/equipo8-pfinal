import { createCartBooking } from '@/app/lib/api/booking';
import type { CartBooking, CreateCartBookingPayload } from '@/app/lib/types/booking';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CART: CartBooking = {
  id: 'b1',
  status: 'CART',
  checkin: '2026-06-01',
  checkout: '2026-06-04',
  hold_expires_at: '2026-06-01T12:15:00',
  total_amount: '300.00',
  currency_code: 'USD',
  property_id: 'p1',
  room_type_id: 'r1',
  rate_plan_id: 'rp1',
  unit_price: '100.00',
};

const PAYLOAD: CreateCartBookingPayload = {
  checkin: '2026-06-01',
  checkout: '2026-06-04',
  currency_code: 'USD',
  property_id: 'p1',
  room_type_id: 'r1',
  rate_plan_id: 'rp1',
  unit_price: '100.00',
};

describe('createCartBooking', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs to /bookings with credentials and JSON content-type', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(CART),
    } as Response);

    await createCartBooking(PAYLOAD);

    const [url, options] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/booking\/bookings$/);
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('returns the cart booking on success', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(CART),
    } as Response);

    const result = await createCartBooking(PAYLOAD);

    expect(result).toEqual(CART);
    expect(result.status).toBe('CART');
    expect(result.hold_expires_at).toBeTruthy();
  });

  it('throws with server message on HTTP error', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ message: 'Room unavailable' }),
    } as Response);

    await expect(createCartBooking(PAYLOAD)).rejects.toThrow('Room unavailable');
  });

  it('throws Error <status> when body has no message', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);

    await expect(createCartBooking(PAYLOAD)).rejects.toThrow('Error 500');
  });
});
