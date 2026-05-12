import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useCheckInStatus } from '@src/features/booking/use-check-in-status';
import { getBookingDetail } from '@src/services/booking-service';
import type { BookingDetail } from '@src/types/booking';

jest.mock('@src/services/booking-service', () => ({
  getBookingDetail: jest.fn(),
}));

const mockedGetBookingDetail = getBookingDetail as jest.MockedFunction<
  typeof getBookingDetail
>;

function makeBooking(status: string): BookingDetail {
  return {
    id: 'a1b2c3d4',
    status,
    checkin: '2026-05-12',
    checkout: '2026-05-15',
    hold_expires_at: '',
    total_amount: '100.00',
    currency_code: 'USD',
    property_id: 'p1',
    room_type_id: 'r1',
    rate_plan_id: 'rp1',
    unit_price: '100.00',
    guests_count: 1,
    nights_breakdown: [],
    taxes: '0',
    service_fee: '0',
    grand_total: '100.00',
    policy_type_applied: 'FULL',
    policy_hours_limit_applied: null,
    policy_refund_percent_applied: null,
    guests: [],
    last_payment_attempt: null,
    created_at: '',
    updated_at: '',
  };
}

describe('useCheckInStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in loading state and resolves to ready when booking is CONFIRMED', async () => {
    mockedGetBookingDetail.mockResolvedValue(makeBooking('CONFIRMED'));
    const { result } = renderHook(() => useCheckInStatus('a1b2c3d4'));
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.bookingDetail?.status).toBe('CONFIRMED');
  });

  it('transitions to checked_in once a poll returns CHECKED_IN', async () => {
    mockedGetBookingDetail
      .mockResolvedValueOnce(makeBooking('CONFIRMED'))
      .mockResolvedValueOnce(makeBooking('CHECKED_IN'));

    const { result } = renderHook(() => useCheckInStatus('a1b2c3d4'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    await waitFor(() => expect(result.current.status).toBe('checked_in'));
    expect(result.current.bookingDetail?.status).toBe('CHECKED_IN');
  });

  it('stops polling after reaching a terminal state', async () => {
    mockedGetBookingDetail.mockResolvedValue(makeBooking('CHECKED_IN'));
    const { result } = renderHook(() => useCheckInStatus('a1b2c3d4'));
    await waitFor(() => expect(result.current.status).toBe('checked_in'));

    const callsAtTerminal = mockedGetBookingDetail.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(15_000);
    });
    expect(mockedGetBookingDetail.mock.calls.length).toBe(callsAtTerminal);
  });

  it('reports cancelled when booking flips to CANCELLED', async () => {
    mockedGetBookingDetail
      .mockResolvedValueOnce(makeBooking('CONFIRMED'))
      .mockResolvedValueOnce(makeBooking('CANCELLED'));

    const { result } = renderHook(() => useCheckInStatus('a1b2c3d4'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    await waitFor(() => expect(result.current.status).toBe('cancelled'));
  });

  it('surfaces error if the initial fetch fails', async () => {
    mockedGetBookingDetail.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCheckInStatus('a1b2c3d4'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('boom');
  });

  it('cleans up the interval on unmount', async () => {
    mockedGetBookingDetail.mockResolvedValue(makeBooking('CONFIRMED'));
    const { result, unmount } = renderHook(() => useCheckInStatus('a1b2c3d4'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const callsAtUnmount = mockedGetBookingDetail.mock.calls.length;
    unmount();

    await act(async () => {
      jest.advanceTimersByTime(15_000);
    });
    expect(mockedGetBookingDetail.mock.calls.length).toBe(callsAtUnmount);
  });

  it('no-ops when bookingId is undefined', () => {
    const { result } = renderHook(() => useCheckInStatus(undefined));
    expect(result.current.status).toBe('loading');
    expect(mockedGetBookingDetail).not.toHaveBeenCalled();
  });
});
