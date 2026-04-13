'use client';
import React, { useState } from 'react';

import { mockBookings } from '@/__tests__/mockBookings';
import { confirmBooking } from '@/services/bookingApi';

import { BookingRequestCard } from '@/components/manager/BookingRequestCard';
import { ConfirmBookingModal } from '@/components/manager/ConfirmBookingModal';

type Booking = (typeof mockBookings)[number];
type ManagerNotificationsPageProps = {
  testBookings?: Booking[];
  testSetBookings?: React.Dispatch<React.SetStateAction<Booking[]>>;
};

export default function ManagerNotificationsPage({
  testBookings,
  testSetBookings,
}: ManagerNotificationsPageProps = {}) {
  // Hooks siempre deben ir en el mismo orden
  const state = useState<Booking[]>(mockBookings);
  const bookings = testBookings ?? state[0];
  const setBookings = testSetBookings ?? state[1];
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmClick = (id: string) => {
    setSelectedBookingId(id);
    setModalOpen(true);
    setError(null);
  };

  const handleDecline = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedBookingId(null);
    setError(null);
  };

  const handleModalConfirm = async (notes: string) => {
    if (!selectedBookingId) return;
    setLoading(true);
    setError(null);
    try {
      await confirmBooking(selectedBookingId, notes);
      setBookings((prev) =>
        prev.map((b) => (b.id === selectedBookingId ? { ...b, status: 'CONFIRMED' } : b))
      );
      handleModalClose();
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message.includes('conflicto') || e.message.includes('inventario'))
      ) {
        setError(
          'No hay disponibilidad suficiente. Puede ofrecer upgrade, cambiar fechas o rechazar la reserva.'
        );
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Notificaciones</h1>
      <p className="mb-6 text-gray-600">
        Tienes {bookings.length} reservas pendientes de confirmación hoy.
      </p>
      <div className="space-y-6">
        {bookings.length === 0 && <div className="text-gray-400">No hay reservas pendientes.</div>}
        {bookings.map((booking) => (
          <BookingRequestCard
            key={booking.id}
            booking={booking}
            onConfirm={handleConfirmClick}
            onDecline={handleDecline}
          />
        ))}
      </div>
      <ConfirmBookingModal
        open={modalOpen}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        loading={loading}
        error={error}
      />
    </div>
  );
}
