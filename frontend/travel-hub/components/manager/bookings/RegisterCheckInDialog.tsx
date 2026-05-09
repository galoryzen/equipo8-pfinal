'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { ApiHttpError, registerGuestCheckIn } from '@/app/lib/api/booking';
import { tokens } from '@/lib/theme/tokens';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** `datetime-local` value in the user's local timezone (no offset suffix). */
export function formatForDatetimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Parses `datetime-local` as local wall time and returns an ISO-8601 UTC string. */
export function localDatetimeInputToUtcIso(value: string): string {
  const d = new Date(value);
  return d.toISOString();
}

export type RegisterCheckInDialogProps = {
  open: boolean;
  bookingId: string | null;
  /** Scheduled stay check-in date `YYYY-MM-DD` (from API). */
  scheduledCheckin: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

export default function RegisterCheckInDialog({
  open,
  bookingId,
  scheduledCheckin,
  onClose,
  onSuccess,
}: RegisterCheckInDialogProps): ReactNode {
  const { t } = useTranslation();
  const [arrivalLocal, setArrivalLocal] = useState(() => formatForDatetimeLocal(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxLocal = formatForDatetimeLocal(new Date());

  const minLocal = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(scheduledCheckin.trim());
    if (!m) return '';
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const day = Number(m[3]);
    const d = new Date(y, mo, day, 0, 1, 0, 0);
    return formatForDatetimeLocal(d);
  }, [scheduledCheckin]);

  useEffect(() => {
    if (open) {
      setArrivalLocal(formatForDatetimeLocal(new Date()));
      setError(null);
      setSubmitting(false);
    }
  }, [open, bookingId]);

  const resolveApiMessage = useCallback(
    (status: number): string | null => {
      if (status === 403) return t('manager.bookings.checkIn.errors.forbidden');
      if (status === 404) return t('manager.bookings.checkIn.errors.notFound');
      if (status === 409) return t('manager.bookings.checkIn.errors.conflict');
      if (status === 422) return t('manager.bookings.checkIn.errors.validation');
      return null;
    },
    [t]
  );

  const handleConfirm = async () => {
    if (submitting) return;
    if (!bookingId) return;
    const trimmed = arrivalLocal.trim();
    if (!trimmed) {
      setError(t('manager.bookings.checkIn.errors.required'));
      return;
    }
    let arrival: Date;
    try {
      arrival = new Date(trimmed);
    } catch {
      setError(t('manager.bookings.checkIn.errors.validation'));
      return;
    }
    if (Number.isNaN(arrival.getTime())) {
      setError(t('manager.bookings.checkIn.errors.validation'));
      return;
    }
    if (arrival.getTime() > Date.now()) {
      setError(t('manager.bookings.checkIn.errors.future'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const actual_arrival_at = localDatetimeInputToUtcIso(trimmed);
      await registerGuestCheckIn(bookingId, { actual_arrival_at });
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
        {t('manager.bookings.checkIn.title')}
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            {error}
          </Alert>
        ) : null}
        <TextField
          label={t('manager.bookings.checkIn.arrivalLabel')}
          type="datetime-local"
          value={arrivalLocal}
          onChange={(e) => setArrivalLocal(e.target.value)}
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
          {t('manager.bookings.checkIn.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
