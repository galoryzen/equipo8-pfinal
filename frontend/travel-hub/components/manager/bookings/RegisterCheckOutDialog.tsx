'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { ApiHttpError, registerBookingCheckOut } from '@/app/lib/api/booking';
import { tokens } from '@/lib/theme/tokens';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';

import {
  formatForDatetimeLocal,
  localDatetimeInputToUtcIso,
} from '@/components/manager/bookings/RegisterCheckInDialog';

export type RegisterCheckOutDialogProps = {
  open: boolean;
  bookingId: string | null;
  /** Scheduled stay check-out date `YYYY-MM-DD` (from API). */
  scheduledCheckout: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

export default function RegisterCheckOutDialog({
  open,
  bookingId,
  scheduledCheckout,
  onClose,
  onSuccess,
}: RegisterCheckOutDialogProps): ReactNode {
  const { t } = useTranslation();
  const [departureLocal, setDepartureLocal] = useState(() => formatForDatetimeLocal(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxLocal = useMemo(() => formatForDatetimeLocal(new Date()), [open]);

  const minLocal = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(scheduledCheckout.trim());
    if (!m) return '';
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const day = Number(m[3]);
    const d = new Date(y, mo, day, 0, 1, 0, 0);
    return formatForDatetimeLocal(d);
  }, [scheduledCheckout]);

  useEffect(() => {
    if (open) {
      setDepartureLocal(formatForDatetimeLocal(new Date()));
      setError(null);
      setSubmitting(false);
    }
  }, [open, bookingId]);

  const resolveApiMessage = useCallback(
    (status: number): string | null => {
      if (status === 403) return t('manager.bookings.checkOut.errors.forbidden');
      if (status === 404) return t('manager.bookings.checkOut.errors.notFound');
      if (status === 409) return t('manager.bookings.checkOut.errors.conflict');
      if (status === 422) return t('manager.bookings.checkOut.errors.validation');
      return null;
    },
    [t]
  );

  const handleConfirm = async () => {
    if (submitting) return;
    if (!bookingId) return;
    const trimmed = departureLocal.trim();
    if (!trimmed) {
      setError(t('manager.bookings.checkOut.errors.required'));
      return;
    }
    let departure: Date;
    try {
      departure = new Date(trimmed);
    } catch {
      setError(t('manager.bookings.checkOut.errors.validation'));
      return;
    }
    if (Number.isNaN(departure.getTime())) {
      setError(t('manager.bookings.checkOut.errors.validation'));
      return;
    }
    if (departure.getTime() > Date.now()) {
      setError(t('manager.bookings.checkOut.errors.future'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const actual_departure_at = localDatetimeInputToUtcIso(trimmed);
      await registerBookingCheckOut(bookingId, { actual_departure_at });
      await onSuccess();
      onClose();
    } catch (caught) {
      if (caught instanceof ApiHttpError) {
        const mapped = resolveApiMessage(caught.status);
        setError(mapped ?? caught.message);
      } else {
        setError(caught instanceof Error ? caught.message : t('common.unknownError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, color: tokens.text.primary }}>
        {t('manager.bookings.checkOut.title')}
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            {error}
          </Alert>
        ) : null}
        <TextField
          label={t('manager.bookings.checkOut.departureLabel')}
          type="datetime-local"
          value={departureLocal}
          onChange={(e) => setDepartureLocal(e.target.value)}
          required
          fullWidth
          disabled={submitting}
          inputProps={{
            max: maxLocal,
            ...(minLocal ? { min: minLocal } : {}),
          }}
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          type="button"
          onClick={onClose}
          disabled={submitting}
          sx={{ textTransform: 'none' }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          variant="contained"
          onClick={() => void handleConfirm()}
          disabled={submitting}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            bgcolor: tokens.brand.accentOrange,
            '&:hover': { bgcolor: tokens.brand.accentOrange, filter: 'brightness(0.95)' },
          }}
        >
          {t('manager.bookings.checkOut.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
