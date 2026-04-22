import { confirmBooking, fetchPendingConfirmationBookings } from '@/app/lib/api/booking';
import ManagerNotificationsPage from '@/app/manager/notifications/page';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockBookings } from './mockBookings';
import { renderWithI18n } from './test-utils';

vi.mock('@/app/lib/api/booking', () => ({
  fetchPendingConfirmationBookings: vi.fn(),
  confirmBooking: vi.fn(),
  rejectBooking: vi.fn(),
}));

function makePaginated(source: typeof mockBookings = mockBookings) {
  const items = source.map((b) => ({
    id: b.id,
    property_id: b.propertyId,
    room_type_id: b.roomTypeId,
    property_name: b.propertyName,
    image_url: b.imageUrl,
    status: b.status,
    guest_name: b.guestName,
    checkin: b.checkin,
    checkout: b.checkout,
    nights: b.nights,
    guests: b.guests,
    total_amount: b.totalAmount,
    currency_code: b.currency,
    created_at: b.createdAt,
  }));
  return { items, total: items.length, page: 1, page_size: 5, total_pages: items.length ? 1 : 0 };
}

describe('ManagerNotificationsPage', () => {
  beforeEach(() => {
    vi.mocked(confirmBooking).mockResolvedValue(undefined);
    vi.mocked(fetchPendingConfirmationBookings).mockResolvedValue(makePaginated());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('muestra reservas pendientes y permite confirmar', async () => {
    // First fetch returns the booking; second fetch (triggered after confirm) returns empty
    vi.mocked(fetchPendingConfirmationBookings)
      .mockResolvedValueOnce(makePaginated(mockBookings))
      .mockResolvedValueOnce(makePaginated([]));

    renderWithI18n(<ManagerNotificationsPage />);

    expect(await screen.findByText(/Deluxe Garden Suite/i)).toBeTruthy();

    const confirmButtons = screen.getAllByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => expect(screen.queryByText(/Deluxe Garden Suite/i)).toBeFalsy());
    expect(screen.getByText(/No hay reservas pendientes|No pending bookings/i)).toBeTruthy();
    expect(vi.mocked(confirmBooking)).toHaveBeenCalledTimes(1);
  });

  it('muestra alerta de conflicto de inventario', async () => {
    vi.mocked(confirmBooking).mockRejectedValueOnce(new Error('conflicto de inventario'));
    renderWithI18n(<ManagerNotificationsPage />);

    expect(await screen.findByText(/Deluxe Garden Suite/i)).toBeTruthy();

    const confirmButtons = screen.getAllByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButtons[0]);

    await waitFor(async () => {
      const alert = await screen.findByRole('alert');
      expect(alert.textContent ?? '').toMatch(/conflicto de inventario/i);
    });
  });
});
