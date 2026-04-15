
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmBookingModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  loading?: boolean;
  error?: string | null;
}

export const ConfirmBookingModal: React.FC<ConfirmBookingModalProps> = ({
  open,
  onClose,
  onConfirm,
  loading = false,
  error,
}) => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-2">{t('manager.confirmBookingTitle')}</h2>
        <p className="mb-4 text-gray-600">
          {t('manager.confirmBookingHint')}
        </p>
        <textarea
          className="w-full border rounded p-2 mb-4 min-h-[80px]"
          placeholder={t('manager.internalNotesPlaceholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
        />
        {error && <div className="text-red-600 mb-2 text-sm">{error}</div>}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
            onClick={onClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </button>
          <button
            className="px-4 py-1 rounded bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
            onClick={() => onConfirm(notes)}
            disabled={loading}
          >
            {loading ? t('manager.confirming') : t('manager.confirmBooking')}
          </button>
        </div>
      </div>
    </div>
  );
};
