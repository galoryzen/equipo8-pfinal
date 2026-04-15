import ManagerNotificationsPage from '@/app/manager/notifications/page';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { mockBookings } from './mockBookings';
import { renderWithI18n } from './test-utils';

vi.mock('@/services/bookingApi', () => ({
  confirmBooking: vi.fn(async (id, notes) => {
    if (notes === 'conflicto') throw new Error('conflicto de inventario');
    return { status: 'CONFIRMED' };
  }),
}));

describe('ManagerNotificationsPage', () => {
  it('muestra reservas pendientes y permite confirmar', async () => {
    type Booking = (typeof mockBookings)[number];
    let bookingsState: Booking[] = [...mockBookings];
    const setBookings: React.Dispatch<React.SetStateAction<Booking[]>> = (fn) => {
      bookingsState = typeof fn === 'function' ? fn(bookingsState) : fn;
    };
    const { rerender } = renderWithI18n(
      <ManagerNotificationsPage testBookings={bookingsState} testSetBookings={setBookings} />
    );
    expect(screen.getByText(/Deluxe Garden Suite/)).toBeTruthy();
    // Click en el botón de la card (el primero con ese texto)
    const cardButtons = screen.getAllByRole('button', { name: /Confirm(ar reserva| booking)/i });
    fireEvent.click(cardButtons[0]);
    // Buscar el texto de hint en ambos idiomas
    expect(
      screen.getByText(/notas internas para el personal del hotel|internal notes for hotel staff/i)
    ).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/notas internas|internal notes/i), {
      target: { value: 'todo ok' },
    });
    // Click en el botón del modal (el último con ese texto)
    const modalButtons = screen.getAllByRole('button', { name: /Confirm(ar reserva| booking)/i });
    fireEvent.click(modalButtons[modalButtons.length - 1]);
    // Simular actualización de bookings
    rerender(<ManagerNotificationsPage testBookings={[]} testSetBookings={setBookings} />);
    await waitFor(() =>
      expect(screen.queryByText(/notas internas para el personal del hotel/i)).toBeFalsy()
    );
    expect(screen.getByText(/No hay reservas pendientes|No pending bookings/i)).toBeTruthy();
  });

  it('muestra alerta de conflicto de inventario', async () => {
    type Booking = (typeof mockBookings)[number];
    let bookingsState: Booking[] = [...mockBookings];
    const setBookings: React.Dispatch<React.SetStateAction<Booking[]>> = (fn) => {
      bookingsState = typeof fn === 'function' ? fn(bookingsState) : fn;
    };
    renderWithI18n(
      <ManagerNotificationsPage testBookings={bookingsState} testSetBookings={setBookings} />
    );
    // Click en el botón de la card (el primero con ese texto)
    const cardButtons = screen.getAllByRole('button', { name: /Confirm(ar reserva| booking)/i });
    fireEvent.click(cardButtons[0]);
    fireEvent.change(screen.getByPlaceholderText(/Notas internas|Internal notes/i), {
      target: { value: 'conflicto' },
    });
    // Click en el botón del modal (el último con ese texto)
    const modalButtons = screen.getAllByRole('button', { name: /Confirm(ar reserva| booking)/i });
    fireEvent.click(modalButtons[modalButtons.length - 1]);
    await waitFor(() =>
      expect(
        screen.getByText(/no hay disponibilidad suficiente|not enough availability/i)
      ).toBeTruthy()
    );
  });
});
