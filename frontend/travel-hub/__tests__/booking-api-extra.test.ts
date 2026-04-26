import {
  CartConflictError,
  cancelCartBooking,
  checkoutBooking,
  confirmBooking,
  createCartBooking,
  fetchPendingConfirmationBookings,
  rejectBooking,
  saveBookingGuests,
} from '@/app/lib/api/booking';
import type {
  BookingDetail,
  CreateCartBookingPayload,
  GuestPayload,
  PaginatedResponse,
  PendingConfirmationBookingItem,
} from '@/app/lib/types/booking';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('booking API uncovered flows', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchPendingConfirmationBookings sends required status and pagination params', async () => {
    const payload: PaginatedResponse<PendingConfirmationBookingItem> = {
      items: [],
      total: 0,
      page: 3,
      page_size: 2,
      total_pages: 0,
    };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    } as Response);

    const result = await fetchPendingConfirmationBookings(3, 2);

    expect(result).toEqual(payload);
    const [url, options] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/booking/bookings?');
    expect(url).toContain('status=PENDING_CONFIRMATION');
    expect(url).toContain('page=3');
    expect(url).toContain('page_size=2');
    expect(options).toEqual({ credentials: 'include' });
  });

  it('fetchPendingConfirmationBookings throws generic status when body cannot be parsed', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.reject(new Error('bad json')),
    } as unknown as Response);

    await expect(fetchPendingConfirmationBookings()).rejects.toThrow('Error 503');
  });

  it('confirmBooking and rejectBooking send PATCH with encoded id', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);

    await confirmBooking('booking/id');
    await rejectBooking('booking/id');

    const [confirmUrl, confirmOpts] = vi.mocked(global.fetch).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(confirmUrl).toContain('/api/v1/booking/bookings/booking%2Fid/confirm');
    expect(confirmOpts.method).toBe('PATCH');
    expect(confirmOpts.credentials).toBe('include');

    const [rejectUrl, rejectOpts] = vi.mocked(global.fetch).mock.calls[1] as [string, RequestInit];
    expect(rejectUrl).toContain('/api/v1/booking/bookings/booking%2Fid/reject');
    expect(rejectOpts.method).toBe('PATCH');
    expect(rejectOpts.credentials).toBe('include');
  });

  it('cancelCartBooking sends POST with encoded id', async () => {
    const detail: BookingDetail = {
      id: 'booking-id',
      status: 'CANCELLED',
      checkin: '2026-06-01',
      checkout: '2026-06-02',
      hold_expires_at: null,
      total_amount: '0',
      currency_code: 'USD',
      property_id: 'p1',
      room_type_id: 'r1',
      rate_plan_id: 'rp1',
      unit_price: '0',
      policy_type_applied: 'STANDARD',
      policy_hours_limit_applied: 24,
      policy_refund_percent_applied: 100,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detail),
    } as Response);

    const result = await cancelCartBooking('booking/id');
    const [url, options] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];

    expect(result).toEqual(detail);
    expect(url).toContain('/api/v1/booking/bookings/booking%2Fid/cancel');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
  });

  it('saveBookingGuests sends PUT with guests payload', async () => {
    const guests: GuestPayload[] = [
      {
        first_name: 'Ana',
        last_name: 'Gomez',
        email: 'ana@example.com',
        phone: '+5711111111',
        is_primary: true,
      },
    ];
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);

    await saveBookingGuests('id-1', guests);

    const [url, options] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/booking/bookings/id-1/guests');
    expect(options.method).toBe('PUT');
    expect(options.body).toBe(JSON.stringify({ guests }));
  });

  it('checkoutBooking returns booking detail and throws API message on error', async () => {
    const payload = {
      id: 'id-1',
      status: 'CONFIRMED',
      checkin: '2026-06-01',
      checkout: '2026-06-02',
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
      updated_at: '2026-01-01',
    } satisfies BookingDetail;
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(payload),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ message: 'Cannot checkout booking' }),
      } as Response);

    await expect(checkoutBooking('id-1')).resolves.toEqual(payload);
    await expect(checkoutBooking('id-1')).rejects.toThrow('Cannot checkout booking');
  });

  it('createCartBooking throws CartConflictError when cart already exists', async () => {
    const requestBody: CreateCartBookingPayload = {
      checkin: '2026-08-01',
      checkout: '2026-08-03',
      currency_code: 'USD',
      property_id: 'p1',
      room_type_id: 'r1',
      rate_plan_id: 'rp1',
    };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          code: 'CART_ALREADY_EXISTS',
          existing_booking_id: 'existing-123',
          message: 'Cart already exists',
        }),
    } as Response);

    try {
      await createCartBooking(requestBody);
      throw new Error('Expected CartConflictError');
    } catch (error) {
      expect(error).toBeInstanceOf(CartConflictError);
      expect(error).toMatchObject({
        name: 'CartConflictError',
        message: 'Cart already exists',
        existingBookingId: 'existing-123',
      } satisfies Partial<CartConflictError>);
    }
  });
});
