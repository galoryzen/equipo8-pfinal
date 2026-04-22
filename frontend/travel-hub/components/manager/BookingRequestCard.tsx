import React from 'react';

import Image from 'next/image';

import { tokens } from '@/lib/theme/tokens';
import Button from '@mui/material/Button';
import { useTranslation } from 'react-i18next';

interface BookingRequestCardProps {
  booking: {
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
  onConfirm: (id: string) => void;
  onDecline: (id: string) => void;
}

export const BookingRequestCard: React.FC<BookingRequestCardProps> = ({
  booking,
  onConfirm,
  onDecline,
}) => {
  const { t } = useTranslation();
  const isPending = booking.status === 'PENDING_CONFIRMATION';

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col md:flex-row">
        <Image
          src={booking.imageUrl}
          alt={booking.propertyName}
          width={320}
          height={220}
          className="h-48 w-full object-cover md:h-auto md:w-64"
        />
        <div className="flex flex-1 flex-col justify-between gap-5 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded bg-orange-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                  {isPending ? t('manager.pendingConfirmation') : booking.status}
                </span>
                <span className="text-xs font-medium" style={{ color: tokens.text.secondary }}>
                  {booking.createdAt}
                </span>
              </div>
              <h3 className="truncate text-2xl font-extrabold leading-tight text-slate-800">
                Reservation Request: {booking.propertyName}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {booking.guestName} · {booking.checkin} - {booking.checkout} ({booking.nights}{' '}
                {t('manager.nights')}) · {booking.guests} {t('manager.guests')}
              </p>
            </div>
            <div className="text-left md:text-right">
              <div className="text-4xl font-black leading-none text-slate-900">
                {booking.currency}
                {booking.totalAmount.toLocaleString()}
              </div>
              <div
                className="mt-1 text-xs font-semibold uppercase tracking-wide"
                style={{ color: tokens.text.secondary }}
              >
                {t('manager.totalStayValue')}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => onDecline(booking.id)}
              sx={{
                minWidth: 112,
                borderColor: '#CBD5E1',
                color: '#475569',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '10px',
              }}
            >
              {t('manager.decline')}
            </Button>
            {isPending && (
              <Button
                variant="contained"
                color="success"
                onClick={() => onConfirm(booking.id)}
                sx={{
                  minWidth: 160,
                  textTransform: 'none',
                  fontWeight: 800,
                  borderRadius: '10px',
                  boxShadow: 'none',
                }}
              >
                {t('manager.confirmBooking')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
