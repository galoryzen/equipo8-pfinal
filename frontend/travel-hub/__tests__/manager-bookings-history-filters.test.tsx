import {
  BookingApiError,
  exportPartnerBookingsCsv,
  fetchHotelBookingsMetrics,
  listPartnerBookings,
} from '@/app/lib/api/booking';
import { getHotelRoomTypes, getManagerHotels } from '@/app/lib/api/manager';
import ManagerBookingsPage from '@/app/manager/bookings/page';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from './test-utils';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/app/lib/api/booking', async () => {
  const actual =
    await vi.importActual<typeof import('@/app/lib/api/booking')>('@/app/lib/api/booking');
  return {
    ...actual,
    listPartnerBookings: vi.fn(),
    fetchHotelBookingsMetrics: vi.fn(),
    exportPartnerBookingsCsv: vi.fn(),
  };
});

vi.mock('@/app/lib/api/manager', () => ({
  getManagerHotels: vi.fn(),
  getHotelRoomTypes: vi.fn(),
}));

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function makeBooking(
  overrides: Partial<{
    id: string;
    room_type_id: string;
    guest_name: string;
    guest_email: string | null;
    created_at: string;
    can_register_check_in: boolean;
    status: string;
  }> = {}
) {
  const id = overrides.id ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const compact = id.replace(/-/g, '').toUpperCase();
  return {
    id,
    status: overrides.status ?? 'CONFIRMED',
    checkin: todayYmd(),
    checkout: '2099-12-31',
    total_amount: '120',
    currency_code: 'USD',
    property_id: 'p1',
    room_type_id: overrides.room_type_id ?? 'rt-suite',
    created_at: overrides.created_at ?? '2026-03-15T14:30:00.000Z',
    property_name: 'Sol Hotel',
    display_reference: `#${compact.slice(-8)}`,
    room_type_name: 'Ocean Suite',
    guest_name: overrides.guest_name ?? 'Alex Guest',
    guest_email: overrides.guest_email ?? 'alex@example.com',
    can_register_check_in: overrides.can_register_check_in ?? false,
    nights: 2,
    guests_count: 2,
  };
}

describe('ManagerBookingsPage — history filters & export', () => {
  beforeEach(() => {
    vi.mocked(fetchHotelBookingsMetrics).mockResolvedValue({
      confirmedCount: 1,
      pendingCount: 0,
      checkInsTodayCount: 0,
      cancelledCount: 0,
    });
    vi.mocked(getManagerHotels).mockResolvedValue({
      items: [
        {
          id: 'prop-1',
          name: 'Sol',
          location: 'X',
          totalRooms: 10,
          occupiedRooms: 0,
          status: 'ACTIVE',
          imageUrl: null,
          categories: 1,
          hotelId: 'h1',
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      total_pages: 1,
    });
    vi.mocked(getHotelRoomTypes).mockResolvedValue({
      items: [
        {
          id: 'rt-suite',
          name: 'Ocean Suite',
          icon: 'suite',
          available: 1,
          total: 2,
          rate_plan_id: null,
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      total_pages: 1,
    });
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [makeBooking()],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    vi.mocked(exportPartnerBookingsCsv).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders booking date column and guest email from API row', async () => {
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    expect(screen.getByText('alex@example.com')).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: /booking date|fecha de reserva/i })
    ).toBeTruthy();
    const cells = screen.getAllByRole('cell');
    expect(
      cells.some((c) => /2026/i.test(c.textContent ?? '') && /15/i.test(c.textContent ?? ''))
    ).toBe(true);
  });

  it('calls listPartnerBookings with status when status filter changes on All tab', async () => {
    const user = userEvent.setup();
    renderWithI18n(<ManagerBookingsPage />);
    await screen.findByText(/Alex Guest/i);
    vi.mocked(listPartnerBookings).mockClear();

    const statusWrap = screen.getByTestId('bookings-status-filter');
    await user.click(within(statusWrap).getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: /confirmed/i }));

    await waitFor(() =>
      expect(vi.mocked(listPartnerBookings)).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CONFIRMED', page: 1, page_size: 10 })
      )
    );
  });

  it('calls listPartnerBookings with date_from and date_to', async () => {
    const user = userEvent.setup();
    renderWithI18n(<ManagerBookingsPage />);
    await screen.findByText(/Alex Guest/i);
    vi.mocked(listPartnerBookings).mockClear();

    await user.type(screen.getByTestId('bookings-date-from'), '2026-06-01');
    await user.type(screen.getByTestId('bookings-date-to'), '2026-06-30');

    await waitFor(() =>
      expect(vi.mocked(listPartnerBookings)).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: '2026-06-01',
          date_to: '2026-06-30',
          page: 1,
        })
      )
    );
  });

  it('calls listPartnerBookings with room_type_id when room type is selected', async () => {
    const user = userEvent.setup();
    renderWithI18n(<ManagerBookingsPage />);
    await screen.findByText(/Alex Guest/i);
    vi.mocked(listPartnerBookings).mockClear();

    const roomWrap = screen.getByTestId('bookings-room-type-filter');
    await user.click(within(roomWrap).getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: /ocean suite/i }));

    await waitFor(() =>
      expect(vi.mocked(listPartnerBookings)).toHaveBeenCalledWith(
        expect.objectContaining({ room_type_id: 'rt-suite', page: 1 })
      )
    );
  });

  it('debounces search and calls listPartnerBookings with q', async () => {
    const user = userEvent.setup();
    renderWithI18n(<ManagerBookingsPage />);
    await screen.findByText(/Alex Guest/i);
    vi.mocked(listPartnerBookings).mockClear();

    await user.type(screen.getByTestId('bookings-search-input'), 'jo');

    await waitFor(
      () =>
        expect(vi.mocked(listPartnerBookings)).toHaveBeenCalledWith(
          expect.objectContaining({ q: 'jo', page: 1 })
        ),
      { timeout: 4000 }
    );
  });

  it('keeps filters when changing pagination page', async () => {
    const user = userEvent.setup();
    vi.mocked(listPartnerBookings)
      .mockResolvedValueOnce({
        items: [makeBooking({ id: 'b1' })],
        total: 25,
        page: 1,
        page_size: 10,
        total_pages: 3,
      })
      .mockResolvedValue({
        items: [makeBooking({ id: 'b2' })],
        total: 25,
        page: 2,
        page_size: 10,
        total_pages: 3,
      });

    renderWithI18n(<ManagerBookingsPage />);
    await screen.findByText(/Alex Guest/i);

    await user.type(screen.getByTestId('bookings-date-from'), '2026-01-01');
    await waitFor(() =>
      expect(vi.mocked(listPartnerBookings)).toHaveBeenCalledWith(
        expect.objectContaining({ date_from: '2026-01-01' })
      )
    );

    vi.mocked(listPartnerBookings).mockClear();
    await user.click(screen.getByRole('button', { name: /go to page 2/i }));

    await waitFor(() =>
      expect(vi.mocked(listPartnerBookings)).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          date_from: '2026-01-01',
        })
      )
    );
  });

  it('resets to page 1 when status filter changes after visiting page 2', async () => {
    const user = userEvent.setup();
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [makeBooking()],
      total: 25,
      page: 1,
      page_size: 10,
      total_pages: 3,
    });

    renderWithI18n(<ManagerBookingsPage />);
    await screen.findByText(/Alex Guest/i);
    await user.click(screen.getByRole('button', { name: /go to page 2/i }));
    await waitFor(() =>
      expect(vi.mocked(listPartnerBookings)).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      )
    );

    vi.mocked(listPartnerBookings).mockClear();
    const statusWrap = screen.getByTestId('bookings-status-filter');
    await user.click(within(statusWrap).getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: /confirmed/i }));

    await waitFor(() =>
      expect(vi.mocked(listPartnerBookings)).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, status: 'CONFIRMED' })
      )
    );
  });

  it('calls exportPartnerBookingsCsv with current filters and without pagination', async () => {
    const user = userEvent.setup();
    renderWithI18n(<ManagerBookingsPage />);
    await screen.findByText(/Alex Guest/i);

    await user.type(screen.getByTestId('bookings-date-from'), '2026-02-01');
    await waitFor(() =>
      expect(vi.mocked(listPartnerBookings).mock.calls.length).toBeGreaterThan(0)
    );

    await user.click(screen.getByTestId('bookings-export-csv'));

    await waitFor(() =>
      expect(vi.mocked(exportPartnerBookingsCsv)).toHaveBeenCalledWith({
        status: undefined,
        date_from: '2026-02-01',
        date_to: undefined,
        room_type_id: undefined,
        q: undefined,
      })
    );
  });

  it('shows snackbar when export fails', async () => {
    const user = userEvent.setup();
    vi.mocked(exportPartnerBookingsCsv).mockRejectedValueOnce(
      new BookingApiError('export failed', 500)
    );
    renderWithI18n(<ManagerBookingsPage />);
    await screen.findByText(/Alex Guest/i);
    await user.click(screen.getByTestId('bookings-export-csv'));
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((a) => /export failed/i.test(a.textContent ?? ''))).toBe(true);
  });

  it('check-in flow still opens from actions menu', async () => {
    const user = userEvent.setup();
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [makeBooking({ can_register_check_in: true })],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    expect(
      screen.getByRole('menuitem', { name: /register check-in|registrar check-in/i })
    ).toBeTruthy();
  });
});
