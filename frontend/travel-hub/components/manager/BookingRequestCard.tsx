
import React from 'react';
import Image from 'next/image';
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

  booking,
  onConfirm,
  onDecline,
}) => {
  const { t } = useTranslation();
  const isPending = booking.status === 'PENDING_CONFIRMATION';

  return (
    <div className="flex bg-white rounded-lg shadow p-4 items-center justify-between">
      <div className="flex items-center gap-4">
        <Image
          src={booking.imageUrl}
          alt={booking.propertyName}
          width={128}
          height={96}
          className="w-32 h-24 object-cover rounded"
        />
        <div>
          <div className="flex gap-2 items-center mb-1">
            {isPending && (
              <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded">
                {t('manager.pendingConfirmation')}
              </span>
            )}
            <span className="text-xs text-gray-400">{booking.createdAt}</span>
          </div>
          <div className="font-semibold text-lg mb-1">{booking.propertyName}</div>
          <div className="text-sm text-gray-600 mb-1">
            {booking.guestName} • {booking.checkin} - {booking.checkout} ({booking.nights} {t('manager.nights')}) •{' '}
            {booking.guests} {t('manager.guests')}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              className="px-4 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
              onClick={() => onDecline(booking.id)}
            >
              {t('manager.decline')}
            </button>
            {isPending && (
              <button
                className="px-4 py-1 rounded bg-green-600 text-white font-semibold hover:bg-green-700"
                onClick={() => onConfirm(booking.id)}
              >
                {t('manager.confirmBooking')}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold">
          {booking.currency} {booking.totalAmount.toLocaleString()}
        </div>
        <div className="text-xs text-gray-400">{t('manager.totalStayValue')}</div>
      </div>
    </div>
  );
};
