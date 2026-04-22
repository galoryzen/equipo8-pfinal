'use client';

import React, { useEffect, useState } from 'react';

import { confirmBooking, fetchPendingConfirmationBookings } from '@/app/lib/api/booking';
import type { PendingConfirmationBookingItem } from '@/app/lib/types/booking';
import { tokens } from '@/lib/theme/tokens';
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
    <div
      className="min-h-[calc(100vh-6rem)] rounded-3xl p-6 md:p-8"
      style={{ backgroundColor: tokens.surface.pageWarm }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-4xl font-black tracking-tight" style={{ color: tokens.text.primary }}>
            {t('manager.notifications')}
          </h1>
          <p className="mt-1 text-sm font-medium" style={{ color: tokens.text.secondary }}>
            {t('manager.pendingBookingsToday', { count: bookings.length })}
          </p>
        </header>

        <section aria-labelledby="pending-requests-heading">
          <div
            className="mb-6 border-b pb-3"
            style={{ borderBottomColor: tokens.border.subtle, borderBottomWidth: 1 }}
          >
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-2">
                <h2
                  id="pending-requests-heading"
                  className="text-sm font-extrabold uppercase tracking-wide"
                  style={{ color: tokens.brand.accentOrangeFg }}
                >
                  Pending Requests
                </h2>
                <div className="flex items-center gap-4">
                  <div
                    className="h-0.5 w-32 rounded"
                    aria-hidden="true"
                    style={{ backgroundColor: tokens.brand.accentOrange }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div aria-live="polite" aria-busy={loading ? 'true' : 'false'}>
            {loading && (
              <div className="text-sm font-medium" style={{ color: tokens.text.muted }}>
                Cargando...
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="rounded-lg border p-3 text-sm font-medium"
                style={{
                  backgroundColor: tokens.state.warningBg,
                  borderColor: tokens.state.warningBorder,
                  color: tokens.state.warningFg,
                }}
              >
                {error}
              </div>
            )}
          </div>

          <div className="mt-5 space-y-5">
            {!loading && bookings.length === 0 && !error && (
              <div
                className="rounded-2xl border p-6 text-sm font-medium"
                style={{
                  borderColor: tokens.border.default,
                  backgroundColor: tokens.surface.paper,
                  color: tokens.text.secondary,
                }}
              >
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

        <footer
          className="mt-7 flex items-center justify-between border-t pt-4 text-sm"
          style={{ borderTopColor: tokens.border.subtle, borderTopWidth: 1 }}
        >
          <span style={{ color: tokens.text.secondary }}>
            Showing {bookings.length} of {bookings.length} pending requests
          </span>
          <div className="flex gap-5 font-semibold" style={{ color: tokens.text.secondary }}>
            <button
              type="button"
              className="rounded-md px-2 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                color: tokens.text.secondary,
                outlineColor: tokens.brand.primary,
              }}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md px-2 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                color: tokens.text.secondary,
                outlineColor: tokens.brand.primary,
              }}
            >
              Next
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
