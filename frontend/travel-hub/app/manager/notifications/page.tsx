'use client';

import React, { useEffect, useState } from 'react';

import { confirmBooking, fetchPendingConfirmationBookings } from '@/app/lib/api/booking';
import type { PendingConfirmationBookingItem } from '@/app/lib/types/booking';
import { useTranslation } from 'react-i18next';

import { BookingRequestCard } from '@/components/manager/BookingRequestCard';

interface Booking {
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
}

function parseString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export default function ManagerNotificationsPage(): React.ReactNode {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPendingConfirmationBookings()
      .then((bookings) => {
        const data = bookings.map((b: PendingConfirmationBookingItem) => {
          return {
            id: parseString(b.id),
            propertyName: parseString(b.property_name),
            imageUrl: parseString(b.image_url, '/default-hotel.jpg'),
            status: parseString(b.status),
            guestName: parseString(b.guest_name),
            checkin: parseString(b.checkin),
            checkout: parseString(b.checkout),
            nights: parseNumber(b.nights),
            guests: parseNumber(b.guests),
            totalAmount: parseNumber(b.total_amount),
            currency: parseString(b.currency_code, '$'),
            createdAt: parseString(b.created_at),
          };
        });

        setBookings(data);
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
      await confirmBooking(id);
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
    <div className="min-h-[calc(100vh-6rem)] rounded-3xl bg-[#F3F5F9] p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            {t('manager.notifications')}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {t('manager.pendingBookingsToday', { count: bookings.length })}
          </p>
        </header>

        <section>
          <div className="mb-6 flex items-end justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-extrabold text-orange-400">Reservation Requests</h2>
          </div>

          {loading && <div className="text-slate-400">Cargando...</div>}
          {error && <div className="rounded-lg bg-red-100 p-3 text-red-700">{error}</div>}

          <div className="space-y-5">
            {!loading && bookings.length === 0 && !error && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
                {t('manager.noPendingBookings')}
              </div>
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
        </section>

        <footer className="mt-7 flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
          <span className="text-slate-500">
            Showing {bookings.length} of {bookings.length} pending requests
          </span>
          <div className="flex gap-5 font-semibold text-slate-500">
            <button type="button" className="transition hover:text-slate-900">
              Previous
            </button>
            <button type="button" className="transition hover:text-slate-900">
              Next
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
