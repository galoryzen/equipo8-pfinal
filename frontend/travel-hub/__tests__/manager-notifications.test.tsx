import { confirmBooking } from '@/app/lib/api/booking';
import ManagerNotificationsPage from '@/app/manager/notifications/page';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { mockBookings } from './mockBookings';
import { renderWithI18n } from './test-utils';

vi.mock('@/app/lib/api/booking', () => ({
  fetchPendingConfirmationBookings: vi.fn(async () => {
    const items = mockBookings.map((b) => ({
      id: b.id,
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
    return {
      items,
      total: items.length,
      page: 1,
      page_size: 5,
      total_pages: 1,
    };
  }),
  confirmBooking: vi.fn(async () => undefined),
}));

describe('ManagerNotificationsPage', () => {
  it('muestra reservas pendientes y permite confirmar', async () => {
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
