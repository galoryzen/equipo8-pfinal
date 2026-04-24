'use client';

import React, { useEffect, useState } from 'react';

import {
  confirmBooking,
  fetchPendingConfirmationBookings,
  rejectBooking,
} from '@/app/lib/api/booking';
import type { PendingConfirmationBookingItem } from '@/app/lib/types/booking';
import { tokens } from '@/lib/theme/tokens';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { BookingRequestCard } from '@/components/manager/BookingRequestCard';

const PAGE_SIZE = 3;

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

interface SnackState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
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

function toBooking(b: PendingConfirmationBookingItem): Booking {
  return {
    id: parseString(b.id),
    propertyName: parseString(b.property_name),
    imageUrl: parseString(b.image_url, '/default-hotel.jpg'),
    status: parseString(b.status),
    guestName: parseString(b.guest_name),
    checkin: parseString(b.checkin),
    checkout: parseString(b.checkout),
    nights: parseNumber(b.nights),
    guests: parseNumber(b.guests_count),
    totalAmount: parseNumber(b.total_amount),
    currency: parseString(b.currency_code, '$'),
    createdAt: parseString(b.created_at),
  };
}

export default function ManagerNotificationsPage(): React.ReactNode {
  const { t } = useTranslation();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [snack, setSnack] = useState<SnackState>({ open: false, message: '', severity: 'success' });

  const [fetchTrigger, setFetchTrigger] = useState(1);

  function loadPage(p: number) {
    setPage(p);
    setFetchTrigger((n) => n + 1);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPendingConfirmationBookings(page, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setBookings(res.items.map(toBooking));
        setTotal(res.total);
        setTotalPages(res.total_pages);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setBookings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTrigger]);

  const handleConfirmClick = async (id: string) => {
    try {
      await confirmBooking(id);
      setSnack({ open: true, message: 'Booking confirmed successfully', severity: 'success' });
      const remaining = bookings.filter((b) => b.id !== id).length;
      loadPage(remaining === 0 && page > 1 ? page - 1 : page);
    } catch (err) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Could not confirm booking',
        severity: 'error',
      });
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await rejectBooking(id);
      setSnack({ open: true, message: 'Booking declined successfully', severity: 'success' });
      const remaining = bookings.filter((b) => b.id !== id).length;
      loadPage(remaining === 0 && page > 1 ? page - 1 : page);
    } catch (err) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Could not decline booking',
        severity: 'error',
      });
    }
  };

  const handleSnackClose = (_: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnack((s) => ({ ...s, open: false }));
  };

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 6rem)',
        width: '100%',
        pb: 3,
        backgroundColor: tokens.surface.pageWarm,
      }}
    >
      <Box component="header" sx={{ mb: 3 }}>
        <Typography
          component="h1"
          sx={{
            fontSize: '2.25rem',
            lineHeight: 1.1,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: tokens.text.primary,
          }}
        >
          {t('manager.notifications')}
        </Typography>
        <Typography
          component="p"
          sx={{ mt: 0.5, fontSize: '0.875rem', fontWeight: 600, color: tokens.text.secondary }}
        >
          {t('manager.pendingBookingsToday', { count: total })}
        </Typography>
      </Box>

      <Box component="section" aria-labelledby="pending-requests-heading">
        <Box sx={{ mb: 3, pb: 1.5 }}>
          <Divider sx={{ borderColor: tokens.border.subtle }} />
          <Stack
            direction="row"
            alignItems="flex-end"
            justifyContent="space-between"
            sx={{ mt: 2 }}
          >
            <Stack spacing={1}>
              <Typography
                id="pending-requests-heading"
                component="h2"
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: tokens.brand.accentOrangeFg,
                }}
              >
                Pending Requests
              </Typography>
              <Box
                aria-hidden="true"
                sx={{
                  height: 3,
                  width: 128,
                  borderRadius: 999,
                  backgroundColor: tokens.brand.accentOrange,
                }}
              />
            </Stack>
          </Stack>
        </Box>

        <Box aria-live="polite" aria-busy={loading ? 'true' : 'false'}>
          {loading && (
            <Typography
              component="p"
              sx={{ fontSize: '0.875rem', fontWeight: 600, color: tokens.text.muted }}
            >
              Cargando...
            </Typography>
          )}
          {error && (
            <Box
              role="alert"
              sx={{
                borderRadius: 2,
                border: '1px solid',
                p: 1.5,
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: tokens.state.warningBg,
                borderColor: tokens.state.warningBorder,
                color: tokens.state.warningFg,
              }}
            >
              {error}
            </Box>
          )}
        </Box>

        <Stack spacing={2} sx={{ mt: 2.5 }}>
          {!loading && bookings.length === 0 && !error && (
            <Box
              sx={{
                borderRadius: 4,
                border: '1px solid',
                p: 3,
                fontSize: '0.875rem',
                fontWeight: 600,
                borderColor: tokens.border.default,
                backgroundColor: tokens.surface.paper,
                color: tokens.text.secondary,
              }}
            >
              {t('manager.noPendingBookings')}
            </Box>
          )}

          {bookings.map((booking) => (
            <BookingRequestCard
              key={booking.id}
              booking={booking}
              onConfirm={handleConfirmClick}
              onDecline={handleDecline}
            />
          ))}
        </Stack>
      </Box>

      <Box
        component="footer"
        sx={{
          mt: 3.5,
          pt: 2,
          borderTop: '1px solid',
          borderTopColor: tokens.border.subtle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          fontSize: '0.875rem',
        }}
      >
        <Typography component="span" sx={{ color: tokens.text.secondary, fontWeight: 500 }}>
          {total > 0
            ? `Showing ${start}–${end} of ${total} pending requests`
            : 'No pending requests'}
        </Typography>

        <Stack direction="row" spacing={1.5}>
          <Button
            type="button"
            variant="text"
            disabled={page <= 1 || loading}
            onClick={() => loadPage(page - 1)}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              color: tokens.text.secondary,
              borderRadius: 2,
              '&:hover': { backgroundColor: tokens.surface.subtle, color: tokens.text.primary },
              '&.Mui-focusVisible': {
                outline: `2px solid ${tokens.brand.primary}`,
                outlineOffset: 2,
              },
            }}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="text"
            disabled={page >= totalPages || loading}
            onClick={() => loadPage(page + 1)}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              color: tokens.text.secondary,
              borderRadius: 2,
              '&:hover': { backgroundColor: tokens.surface.subtle, color: tokens.text.primary },
              '&.Mui-focusVisible': {
                outline: `2px solid ${tokens.brand.primary}`,
                outlineOffset: 2,
              },
            }}
          >
            Next
          </Button>
        </Stack>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackClose}
          severity={snack.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
