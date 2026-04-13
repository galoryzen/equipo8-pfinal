// --- ¡IMPORTANTE! ---
// Para Vitest, los vi.mock y variables usadas en mocks deben ir antes de cualquier import
import React from 'react';

import ManagerNotificationsPage from '@/app/manager/notifications/page';
import '@testing-library/jest-dom';
// No mock de useState, ahora se controla por props

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { mockBookings } from './mockBookings';

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
    const { rerender } = render(
      <ManagerNotificationsPage testBookings={bookingsState} testSetBookings={setBookings} />
    );
    expect(screen.getByText(/Deluxe Garden Suite/)).toBeInTheDocument();
    // Click en el botón de la card (el primero con ese texto)
    const cardButtons = screen.getAllByRole('button', { name: /Confirmar reserva/ });
    fireEvent.click(cardButtons[0]);
    expect(screen.getByText(/Puedes agregar notas internas/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Notas internas/), {
      target: { value: 'todo ok' },
    });
    // Click en el botón del modal (el último con ese texto)
    const modalButtons = screen.getAllByRole('button', { name: /Confirmar reserva/ });
    fireEvent.click(modalButtons[modalButtons.length - 1]);
    // Simular actualización de bookings
    rerender(<ManagerNotificationsPage testBookings={[]} testSetBookings={setBookings} />);
    await waitFor(() =>
      expect(screen.queryByText(/Puedes agregar notas internas/)).not.toBeInTheDocument()
    );
    expect(screen.getByText(/No hay reservas pendientes/)).toBeInTheDocument();
  });

  it('muestra alerta de conflicto de inventario', async () => {
    type Booking = (typeof mockBookings)[number];
    let bookingsState: Booking[] = [...mockBookings];
    const setBookings: React.Dispatch<React.SetStateAction<Booking[]>> = (fn) => {
      bookingsState = typeof fn === 'function' ? fn(bookingsState) : fn;
    };
    render(<ManagerNotificationsPage testBookings={bookingsState} testSetBookings={setBookings} />);
    // Click en el botón de la card (el primero con ese texto)
    const cardButtons = screen.getAllByRole('button', { name: /Confirmar reserva/ });
    fireEvent.click(cardButtons[0]);
    fireEvent.change(screen.getByPlaceholderText(/Notas internas/), {
      target: { value: 'conflicto' },
    });
    // Click en el botón del modal (el último con ese texto)
    const modalButtons = screen.getAllByRole('button', { name: /Confirmar reserva/ });
    fireEvent.click(modalButtons[modalButtons.length - 1]);
    await waitFor(() =>
      expect(screen.getByText(/No hay disponibilidad suficiente/)).toBeInTheDocument()
    );
  });
});
