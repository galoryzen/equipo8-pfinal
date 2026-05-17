import {
  ApiHttpError,
  fetchHotelBookingsMetrics,
  listPartnerBookings,
  registerBookingCheckOut,
  registerGuestCheckIn,
} from '@/app/lib/api/booking';
import ManagerBookingsPage from '@/app/manager/bookings/page';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterCheckInDialog from '@/components/manager/bookings/RegisterCheckInDialog';
import RegisterCheckOutDialog from '@/components/manager/bookings/RegisterCheckOutDialog';

import { renderWithI18n } from './test-utils';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/app/lib/api/auth', () => ({
  getMe: vi.fn().mockResolvedValue({ email: 'test@example.com', role: 'HOTEL' }),
}));

vi.mock('@/app/lib/api/booking', async () => {
  const actual =
    await vi.importActual<typeof import('@/app/lib/api/booking')>('@/app/lib/api/booking');
  return {
    ...actual,
    listPartnerBookings: vi.fn(),
    fetchHotelBookingsMetrics: vi.fn(),
    registerGuestCheckIn: vi.fn(),
    registerBookingCheckOut: vi.fn(),
    exportPartnerBookingsCsv: vi.fn(),
  };
});

vi.mock('@/app/lib/api/manager', () => ({
  getManagerHotels: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    page_size: 100,
    total_pages: 0,
  }),
  getHotelRoomTypes: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    page_size: 100,
    total_pages: 0,
  }),
}));

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function makeBooking(
  overrides: {
    id?: string;
    can_register_check_in?: boolean;
    can_register_check_out?: boolean;
    status?: string;
    guest_name?: string;
    guest_image_url?: string | null;
    display_reference?: string;
    room_type_name?: string | null;
    checkout?: string;
    actual_checkin_at?: string | null;
  } = {}
) {
  const checkin = todayYmd();
  const id = overrides.id ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const compact = id.replace(/-/g, '').toUpperCase();
  return {
    id,
    status: overrides.status ?? 'CONFIRMED',
    checkin,
    checkout: overrides.checkout ?? '2099-12-31',
    total_amount: '120',
    currency_code: 'USD',
    property_id: 'p1',
    room_type_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    created_at: '2026-01-01T00:00:00Z',
    property_name: 'Sol Hotel',
    display_reference: overrides.display_reference ?? `#${compact.slice(-8)}`,
    room_type_name: overrides.room_type_name ?? 'Deluxe King',
    guest_name: overrides.guest_name ?? 'Alex Guest',
    guest_image_url: overrides.guest_image_url,
    can_register_check_in: overrides.can_register_check_in ?? false,
    can_register_check_out: overrides.can_register_check_out,
    actual_checkin_at: overrides.actual_checkin_at ?? null,
    nights: 2,
    guests_count: 2,
  };
}

describe('ManagerBookingsPage — hotel check-in', () => {
  beforeEach(() => {
    vi.mocked(fetchHotelBookingsMetrics).mockResolvedValue({
      confirmedCount: 9,
      pendingCount: 8,
      checkInsTodayCount: 7,
      cancelledCount: 6,
    });
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [makeBooking({ can_register_check_in: true })],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    vi.mocked(registerBookingCheckOut).mockResolvedValue({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      status: 'CHECKED_OUT',
      checkin: todayYmd(),
      checkout: '2099-12-31',
      hold_expires_at: null,
      total_amount: '120',
      currency_code: 'USD',
      property_id: 'p1',
      room_type_id: 'r1',
      rate_plan_id: 'rp1',
      unit_price: '60',
      policy_type_applied: 'FULL',
      policy_hours_limit_applied: 24,
      policy_refund_percent_applied: 100,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      can_register_check_in: false,
      can_register_check_out: false,
      actual_checkin_at: '2026-05-03T12:00:00Z',
      actual_checkout_at: '2026-05-03T14:00:00Z',
    });
    vi.mocked(registerGuestCheckIn).mockResolvedValue({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      status: 'CHECKED_IN',
      checkin: todayYmd(),
      checkout: '2099-12-31',
      hold_expires_at: null,
      total_amount: '120',
      currency_code: 'USD',
      property_id: 'p1',
      room_type_id: 'r1',
      rate_plan_id: 'rp1',
      unit_price: '60',
      policy_type_applied: 'FULL',
      policy_hours_limit_applied: 24,
      policy_refund_percent_applied: 100,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      can_register_check_in: false,
      actual_checkin_at: '2026-05-03T12:00:00Z',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders guest name above booking id in the first column', async () => {
    renderWithI18n(<ManagerBookingsPage />);
    const cell = await screen.findByText(/Alex Guest/i);
    const row = cell.closest('tr');
    expect(row).toBeTruthy();
    const text = row?.textContent ?? '';
    const nameIdx = text.indexOf('Alex Guest');
    const idIdx = text.search(/#[0-9A-F]{8}/);
    expect(nameIdx).toBeGreaterThanOrEqual(0);
    expect(idIdx).toBeGreaterThan(nameIdx);
  });

  it('renders avatar placeholder (initials) when no guest_image_url', async () => {
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText('AG')).toBeTruthy();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('uses guest image when guest_image_url is provided', async () => {
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [
        makeBooking({
          can_register_check_in: false,
          guest_image_url: 'https://example.com/g.png',
        }),
      ],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    const { container } = renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    const img = container.querySelector('img[src="https://example.com/g.png"]');
    expect(img).toBeTruthy();
  });

  it('shows Register check-in in the menu only when can_register_check_in is true', async () => {
    const user = userEvent.setup();
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    expect(
      screen.getByRole('menuitem', { name: /register check-in|registrar check-in/i })
    ).toBeTruthy();
  });

  it('does not list Register check-in when can_register_check_in is false', async () => {
    const user = userEvent.setup();
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [
        makeBooking({ id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', can_register_check_in: false }),
      ],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    expect(
      screen.queryByRole('menuitem', { name: /register check-in|registrar check-in/i })
    ).toBeNull();
  });

  it('opens check-in modal from Actions menu with arrival field', async () => {
    const user = userEvent.setup();
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    await user.click(
      screen.getByRole('menuitem', { name: /register check-in|registrar check-in/i })
    );
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByLabelText(/actual arrival time|hora real de llegada/i)).toBeTruthy();
  });

  it('calls check-in endpoint with actual_arrival_at on confirm', async () => {
    const user = userEvent.setup();
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    await user.click(
      screen.getByRole('menuitem', { name: /register check-in|registrar check-in/i })
    );
    const field = await screen.findByLabelText(/actual arrival time|hora real de llegada/i);
    fireEvent.change(field, { target: { value: '2020-01-01T10:00' } });
    await user.click(screen.getByRole('button', { name: /confirm check-in|confirmar check-in/i }));
    await waitFor(() => expect(vi.mocked(registerGuestCheckIn)).toHaveBeenCalled());
    const arg = vi.mocked(registerGuestCheckIn).mock.calls[0]?.[1];
    expect(arg).toMatchObject({ actual_arrival_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) });
  });

  it('after successful check-in updates badge and removes register action', async () => {
    const user = userEvent.setup();
    vi.mocked(listPartnerBookings)
      .mockResolvedValueOnce({
        items: [makeBooking({ can_register_check_in: true })],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      })
      .mockResolvedValueOnce({
        items: [makeBooking({ can_register_check_in: false, status: 'CHECKED_IN' })],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      });

    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    await user.click(
      screen.getByRole('menuitem', { name: /register check-in|registrar check-in/i })
    );
    const field = await screen.findByLabelText(/actual arrival time|hora real de llegada/i);
    fireEvent.change(field, { target: { value: '2020-01-01T10:00' } });
    await user.click(screen.getByRole('button', { name: /confirm check-in|confirmar check-in/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText(/checked in|check-in realizado/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    expect(
      screen.queryByRole('menuitem', { name: /register check-in|registrar check-in/i })
    ).toBeNull();
  });

  it('shows bottom stats cards for Confirmed, Pending, Check-ins today, Cancelled', async () => {
    vi.mocked(fetchHotelBookingsMetrics).mockResolvedValue({
      confirmedCount: 1,
      pendingCount: 1,
      checkInsTodayCount: 2,
      cancelledCount: 1,
    });
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [
        makeBooking({ id: 'a1', status: 'CONFIRMED', can_register_check_in: false }),
        makeBooking({
          id: 'a2',
          status: 'PENDING_CONFIRMATION',
          can_register_check_in: false,
          guest_name: 'Other',
        }),
        makeBooking({
          id: 'a3',
          status: 'CANCELLED',
          can_register_check_in: false,
          guest_name: 'Zoe Cancelled',
        }),
      ],
      total: 3,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText('Other')).toBeTruthy();
    expect(screen.getByText('Zoe Cancelled')).toBeTruthy();
    expect(
      (await screen.findByTestId('bookings-stat-confirmed')).previousElementSibling?.textContent
    ).toMatch(/confirmed|confirmadas/i);
    expect(
      (await screen.findByTestId('bookings-stat-pending')).previousElementSibling?.textContent
    ).toMatch(/pending|pendientes/i);
    expect(
      (await screen.findByTestId('bookings-stat-checkins-today')).previousElementSibling
        ?.textContent
    ).toMatch(/check-ins \(today\)|check-ins \(hoy\)/i);
    expect(
      (await screen.findByTestId('bookings-stat-cancelled')).previousElementSibling?.textContent
    ).toMatch(/cancelled|canceladas/i);
    expect((await screen.findByTestId('bookings-stat-confirmed')).textContent).toBe('1');
    expect((await screen.findByTestId('bookings-stat-pending')).textContent).toBe('1');
    expect((await screen.findByTestId('bookings-stat-checkins-today')).textContent).toBe('2');
    expect((await screen.findByTestId('bookings-stat-cancelled')).textContent).toBe('1');
  });

  it('uses fetchHotelBookingsMetrics for stat card values, not row counts on the current page', async () => {
    vi.mocked(fetchHotelBookingsMetrics).mockResolvedValue({
      confirmedCount: 42,
      pendingCount: 0,
      checkInsTodayCount: 0,
      cancelledCount: 0,
    });
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [makeBooking({ status: 'CONFIRMED', can_register_check_in: false })],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByTestId('bookings-stat-confirmed')).toBeTruthy();
    expect(screen.getByTestId('bookings-stat-confirmed').textContent).toBe('42');
  });

  it('does not show the obsolete page-only metrics disclaimer', async () => {
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    expect(screen.queryByText(/current table page only|página actual de la tabla/i)).toBeNull();
  });

  it('renders distinct display references for two bookings', async () => {
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [
        makeBooking({
          id: '90000000-0000-0000-0000-000000000001',
          guest_name: 'A',
          display_reference: '#00000001',
          can_register_check_in: false,
        }),
        makeBooking({
          id: '90000000-0000-0000-0000-0000000000aa',
          guest_name: 'B',
          display_reference: '#000000AA',
          can_register_check_in: false,
        }),
      ],
      total: 2,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText('#00000001')).toBeTruthy();
    expect(screen.getByText('#000000AA')).toBeTruthy();
  });

  it('shows readable room type label from API, not a numeric id fragment', async () => {
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [
        makeBooking({
          room_type_name: 'Ocean View Suite',
          can_register_check_in: false,
        }),
      ],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText('Ocean View Suite')).toBeTruthy();
    expect(screen.queryByText(/Room type · 60000000|Tipo de habitación · 60000000/i)).toBeNull();
  });

  it('disabled actions expose an accessible explanation', async () => {
    const user = userEvent.setup();
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    const edit = screen.getByRole('menuitem', {
      name: /edit details.*future story|editar detalles.*próxima historia/i,
    });
    expect(edit.getAttribute('aria-label') ?? '').toMatch(/future story|próxima historia/i);
  });

  it('shows Register check-out enabled when can_register_check_out is true', async () => {
    const user = userEvent.setup();
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [
        makeBooking({
          status: 'CHECKED_IN',
          can_register_check_in: false,
          can_register_check_out: true,
          checkout: todayYmd(),
        }),
      ],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    const item = screen.getByRole('menuitem', { name: /register check-out|registrar check-out/i });
    expect(item.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('shows disabled Register check-out with hint when CHECKED_IN but not eligible', async () => {
    const user = userEvent.setup();
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [
        makeBooking({
          status: 'CHECKED_IN',
          can_register_check_in: false,
          can_register_check_out: false,
          checkout: '2099-12-31',
        }),
      ],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    const item = screen.getByRole('menuitem', {
      name: /register check-out.*today or earlier|registrar check-out.*hoy o anterior/i,
    });
    expect(
      item.getAttribute('aria-disabled') === 'true' || item.closest('[aria-disabled="true"]')
    ).toBeTruthy();
  });

  it('opens check-out modal with departure field and calls API on confirm', async () => {
    const user = userEvent.setup();
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [
        makeBooking({
          status: 'CHECKED_IN',
          can_register_check_in: false,
          can_register_check_out: true,
          checkout: todayYmd(),
        }),
      ],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    await user.click(
      screen.getByRole('menuitem', { name: /register check-out|registrar check-out/i })
    );
    expect(await screen.findByLabelText(/actual departure time|hora real de salida/i)).toBeTruthy();
    const field = screen.getByLabelText(/actual departure time|hora real de salida/i);
    fireEvent.change(field, { target: { value: '2020-01-01T10:00' } });
    await user.click(
      screen.getByRole('button', { name: /confirm check-out|confirmar check-out/i })
    );
    await waitFor(() => expect(vi.mocked(registerBookingCheckOut)).toHaveBeenCalled());
    const arg = vi.mocked(registerBookingCheckOut).mock.calls[0]?.[1];
    expect(arg).toMatchObject({
      actual_departure_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it('after successful check-out shows Checked out badge and hides register check-out', async () => {
    const user = userEvent.setup();
    vi.mocked(listPartnerBookings)
      .mockResolvedValueOnce({
        items: [
          makeBooking({
            status: 'CHECKED_IN',
            can_register_check_in: false,
            can_register_check_out: true,
            checkout: todayYmd(),
          }),
        ],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      })
      .mockResolvedValueOnce({
        items: [
          makeBooking({
            status: 'CHECKED_OUT',
            can_register_check_in: false,
            can_register_check_out: false,
            checkout: todayYmd(),
          }),
        ],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      });

    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    await user.click(
      screen.getByRole('menuitem', { name: /register check-out|registrar check-out/i })
    );
    const field = await screen.findByLabelText(/actual departure time|hora real de salida/i);
    fireEvent.change(field, { target: { value: '2020-01-01T10:00' } });
    await user.click(
      screen.getByRole('button', { name: /confirm check-out|confirmar check-out/i })
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText(/checked out|check-out realizado/i)).toBeTruthy();
  });

  it('shows clear check-out conflict message on 409 without crashing', async () => {
    const user = userEvent.setup();
    vi.mocked(listPartnerBookings).mockResolvedValue({
      items: [
        makeBooking({
          status: 'CHECKED_IN',
          can_register_check_in: false,
          can_register_check_out: true,
          checkout: todayYmd(),
        }),
      ],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    });
    vi.mocked(registerBookingCheckOut).mockRejectedValueOnce(
      new ApiHttpError('raw', 409, { detail: 'x' })
    );
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    await user.click(
      screen.getByRole('menuitem', { name: /register check-out|registrar check-out/i })
    );
    const field = await screen.findByLabelText(/actual departure time|hora real de salida/i);
    fireEvent.change(field, { target: { value: '2020-01-01T10:00' } });
    await user.click(
      screen.getByRole('button', { name: /confirm check-out|confirmar check-out/i })
    );
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Alex Guest/i)).toBeTruthy();
  });

  it('shows conflict message on 409 without crashing', async () => {
    const user = userEvent.setup();
    vi.mocked(registerGuestCheckIn).mockRejectedValueOnce(
      new ApiHttpError('raw', 409, { detail: 'x' })
    );
    renderWithI18n(<ManagerBookingsPage />);
    expect(await screen.findByText(/Alex Guest/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /actions|acciones/i }));
    await user.click(
      screen.getByRole('menuitem', { name: /register check-in|registrar check-in/i })
    );
    const field = await screen.findByLabelText(/actual arrival time|hora real de llegada/i);
    fireEvent.change(field, { target: { value: '2020-01-01T10:00' } });
    await user.click(screen.getByRole('button', { name: /confirm check-in|confirmar check-in/i }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Alex Guest/i)).toBeTruthy();
  });
});

describe('RegisterCheckOutDialog', () => {
  it('maps 409 to conflict copy', async () => {
    vi.mocked(registerBookingCheckOut).mockReset();
    vi.mocked(registerBookingCheckOut).mockRejectedValueOnce(new ApiHttpError('x', 409, {}));
    const onSuccess = vi.fn();
    renderWithI18n(
      <RegisterCheckOutDialog
        open
        bookingId="bid"
        scheduledCheckout="2020-01-01"
        onClose={() => {}}
        onSuccess={onSuccess}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /confirm check-out|confirmar check-out/i }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent ?? '').toMatch(/verify|verifica|estado|fecha/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('RegisterCheckInDialog', () => {
  it('maps 403 to forbidden copy', async () => {
    vi.mocked(registerGuestCheckIn).mockReset();
    vi.mocked(registerGuestCheckIn).mockRejectedValueOnce(new ApiHttpError('x', 403, {}));
    const onSuccess = vi.fn();
    renderWithI18n(
      <RegisterCheckInDialog
        open
        bookingId="bid"
        scheduledCheckin="2020-01-01"
        onClose={() => {}}
        onSuccess={onSuccess}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /confirm check-in|confirmar check-in/i }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent ?? '').toMatch(/permission|permisos/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
