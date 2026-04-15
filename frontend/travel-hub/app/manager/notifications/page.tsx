'use client';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { mockBookings } from '@/__tests__/mockBookings';
import { confirmBooking } from '@/services/bookingApi';

import { BookingRequestCard } from '@/components/manager/BookingRequestCard';
import { ConfirmBookingModal } from '@/components/manager/ConfirmBookingModal';

type Booking = (typeof mockBookings)[number];
type ManagerNotificationsPageProps = {
  testBookings?: Booking[];
  testSetBookings?: React.Dispatch<React.SetStateAction<Booking[]>>;
};

  testBookings,
  testSetBookings,
}: ManagerNotificationsPageProps = {}) {
  const { t } = useTranslation();
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
        setError(t('manager.noAvailability'));
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(t('common.unknownError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">{t('manager.notifications')}</h1>
      <p className="mb-6 text-gray-600">
        {t('manager.pendingBookingsToday', { count: bookings.length })}
      </p>
      <div className="space-y-6">
        {bookings.length === 0 && <div className="text-gray-400">{t('manager.noPendingBookings')}</div>}
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
