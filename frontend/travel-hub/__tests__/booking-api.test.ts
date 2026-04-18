import { getBookingDetail, getMyBookings } from '@/app/lib/api/booking';
import type { BookingDetail, BookingListItem } from '@/app/lib/types/booking';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function expectFetchListCall(): void {
  const call = vi.mocked(global.fetch).mock.calls[0];
  expect(call?.[0]).toMatch(/\/api\/v1\/booking\/bookings$/);
  expect(call?.[1]).toEqual({ credentials: 'include' });
}

function expectFetchDetailCall(bookingId: string): void {
  const call = vi.mocked(global.fetch).mock.calls.at(-1);
  expect(String(call?.[0])).toContain(`/api/v1/booking/bookings/${encodeURIComponent(bookingId)}`);
  expect(call?.[1]).toEqual({ credentials: 'include' });
}

describe('booking API', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMyBookings', () => {
    it('returns JSON on success and sends credentials: include', async () => {
      const payload: BookingListItem[] = [
        {
          id: 'b1',
          status: 'CONFIRMED',
          checkin: '2026-06-01',
          checkout: '2026-06-05',
          total_amount: '100',
          currency_code: 'USD',
          property_id: 'p1',
          room_type_id: 'r1',
          created_at: '2026-01-01',
        },
      ];
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(payload),
      } as Response);

      const result = await getMyBookings();

      expect(result).toEqual(payload);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expectFetchListCall();
    });

    it('throws with message from JSON body on HTTP error', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ message: 'Gateway timeout' }),
      } as Response);

      await expect(getMyBookings()).rejects.toThrow('Gateway timeout');
      expectFetchListCall();
    });

    it('throws Error <status> when body has no message', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'ignored' }),
      } as Response);

      await expect(getMyBookings()).rejects.toThrow('Error 500');
    });
  });

  describe('getBookingDetail', () => {
    it('returns JSON on success and sends credentials: include', async () => {
      const payload: BookingDetail = {
        id: 'bid',
        status: 'CONFIRMED',
        checkin: '2026-06-01',
        checkout: '2026-06-05',
        hold_expires_at: null,
        total_amount: '100',
        currency_code: 'USD',
        property_id: 'p1',
        room_type_id: 'r1',
        rate_plan_id: 'rp1',
        unit_price: '100',
        policy_type_applied: 'STANDARD',
        policy_hours_limit_applied: 24,
        policy_refund_percent_applied: 100,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      };
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(payload),
      } as Response);

      const result = await getBookingDetail('bid');

      expect(result).toEqual(payload);
      expectFetchDetailCall('bid');
    });

    it('encodes booking id in the URL', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'x',
            status: 'CART',
            checkin: '2026-06-01',
            checkout: '2026-06-02',
            hold_expires_at: null,
            total_amount: '0',
            currency_code: 'USD',
            property_id: 'p1',
            room_type_id: 'r1',
            rate_plan_id: 'rp1',
            unit_price: '0',
            policy_type_applied: 'NONE',
            policy_hours_limit_applied: null,
            policy_refund_percent_applied: null,
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          } satisfies BookingDetail),
      } as Response);

      await getBookingDetail('a/b');

      expectFetchDetailCall('a/b');
    });

    it('throws on HTTP error', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      } as Response);

      await expect(getBookingDetail('missing')).rejects.toThrow('Not found');
      expectFetchDetailCall('missing');
    });
  });
});
