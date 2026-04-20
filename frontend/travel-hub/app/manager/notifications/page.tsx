'use client';

import React, { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { BookingRequestCard } from '@/components/manager/BookingRequestCard';

type Booking = {
  id: string;
  propertyName: string;
  imageUrl: string;
  status: string;
  guestName: string;
  checkin: string;
  checkout: string;
  nights: number;
  guests: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
};

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.travelhub.galoryzen.xyz'}/api/v1/booking/bookings?status=PENDING_CONFIRMATION`;

const ManagerNotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(API_URL, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Error fetching bookings');
        const data = await res.json();
        setBookings(
          (data.bookings || data).map((b: Record<string, unknown>) => ({
            id: String(b.id),
            propertyName: String(b.propertyName ?? b.property_name),
            imageUrl: String(b.imageUrl ?? b.image_url ?? '/default-hotel.jpg'),
            status: String(b.status),
            guestName: String(b.guestName ?? b.guest_name),
            checkin: String(b.checkin ?? b.check_in),
            checkout: String(b.checkout ?? b.check_out),
            nights: Number(b.nights),
            guests: Number(b.guests),
            totalAmount: Number(b.totalAmount ?? b.total_amount),
            currency: String(b.currency ?? '$'),
            createdAt: String(b.createdAt ?? b.created_at ?? ''),
          }))
        );
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setBookings([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleConfirmClick = async (id: string) => {
    try {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.travelhub.galoryzen.xyz';
      const res = await fetch(`${baseUrl}/api/v1/booking/bookings/${id}/confirm`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al confirmar la reserva');
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">{t('manager.notifications')}</h1>
      <p className="mb-6 text-gray-600">
        {t('manager.pendingBookingsToday', { count: bookings.length })}
      </p>
      {loading && <div className="text-gray-400">Cargando...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="space-y-6">
        {!loading && bookings.length === 0 && !error && (
          <div className="text-gray-400">{t('manager.noPendingBookings')}</div>
        )}
        {bookings.map((booking) => (
          <BookingRequestCard
            key={booking.id}
            booking={booking}
            onConfirm={handleConfirmClick}
            onDecline={handleDecline}
          />
        ))}
      </div>
    </div>
  );
};

export default ManagerNotificationsPage;
