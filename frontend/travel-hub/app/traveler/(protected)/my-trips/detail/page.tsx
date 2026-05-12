'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';

import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';

import {
  abandonCart,
  cancelBooking,
  getBookingDetail,
  getRefundByBookingId,
} from '@/app/lib/api/booking';
import { formatBookingRef, formatTripDate } from '@/app/lib/myTrips/formatting';
import { fetchPropertyDetailsMap } from '@/app/lib/myTrips/loadPropertyDetails';
import { statusChipProps } from '@/app/lib/myTrips/statusLabels';
import type { BookingDetail, RefundDetail } from '@/app/lib/types/booking';
import type { PropertyDetail } from '@/app/lib/types/catalog';
import { useCurrency } from '@/lib/currency/CurrencyProvider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

function BookingDetailContent() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId')?.trim() ?? '';

  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [propertyById, setPropertyById] = useState<Record<string, PropertyDetail | null>>({});
  const [refund, setRefund] = useState<RefundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const handleCancelReservation = useCallback(async () => {
    if (!detail) return;
    setCancelling(true);
    try {
      // CART → abandon (no refund); CONFIRMED → cancel (policy-gated, async refund).
      const updated =
        detail.status === 'CART' ? await abandonCart(detail.id) : await cancelBooking(detail.id);
      setDetail(updated as BookingDetail);
      setSnackbar({
        open: true,
        message: t('tripDetail.cancelSuccess'),
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : t('tripDetail.cancelFailed'),
        severity: 'error',
      });
    } finally {
      setCancelling(false);
    }
  }, [detail, t]);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      setError('Missing booking');
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const d = await getBookingDetail(bookingId);
        if (cancelled) return;
        setDetail(d);
        const map = await fetchPropertyDetailsMap([d.property_id]);
        if (cancelled) return;
        setPropertyById(map);
        const refundData = await getRefundByBookingId(bookingId);
        if (!cancelled) setRefund(refundData ?? null);
      } catch (e) {
        if (!cancelled) {
          setDetail(null);
          setError(e instanceof Error ? e.message : 'Could not load booking');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress aria-label={t('a11y.loading')} />
      </Container>
    );
  }

  if (error || !detail) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error ?? 'Booking not found'}
        </Alert>
        <Button
          component={NextLink}
          href="/traveler/my-trips"
          variant="outlined"
          sx={{ textTransform: 'none' }}
        >
          {t('tripDetail.backButton')}
        </Button>
      </Container>
    );
  }

  const status = statusChipProps(detail.status);
  const canCancel = detail.status === 'CONFIRMED' || detail.status === 'CART';
  const hotel = propertyById[detail.property_id] ?? null;
  const roomName = hotel?.room_types?.find((r) => r.id === detail.room_type_id)?.name;
  const refundAmount = refund?.status === 'SUCCEEDED' ? parseFloat(refund.amount) : 0;
  const totalPaid = parseFloat(detail.grand_total ?? detail.total_amount);
  const finalTotal = Number((totalPaid - refundAmount).toFixed(2));
  const taxes = Number(detail.taxes ?? 0);
  const serviceFee = Number(detail.service_fee ?? 0);
  const nights = detail.nights_breakdown ?? [];
  const hasCostDetails = Boolean(detail.taxes || detail.service_fee || nights.length > 0);

  return (
    <Container maxWidth="md" sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <Button
        component={NextLink}
        href="/traveler/my-trips"
        sx={{ textTransform: 'none', mb: 2 }}
        variant="text"
      >
        <ArrowBackIcon /> {t('tripDetail.breadcrumb')}
      </Button>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          {t('tripDetail.reservationDetails')}
        </Typography>
        <Chip label={status.label} color={status.color} sx={{ fontWeight: 600 }} />
      </Box>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {hotel?.name ?? 'Property'} · {formatBookingRef(detail.id)}
      </Typography>

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Check-in
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {formatTripDate(detail.checkin)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {t('tripDetail.checkOut')}
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {formatTripDate(detail.checkout)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {t('tripDetail.total')}
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {formatPrice(totalPaid)}
          </Typography>

          {hasCostDetails && (
            <Accordion
              disableGutters
              elevation={0}
              sx={{
                mt: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="trip-cost-breakdown"
                id="trip-cost-breakdown-header"
                sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.75 } }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {t('tripDetail.costDetails')}
                </Typography>
              </AccordionSummary>
              <AccordionDetails id="trip-cost-breakdown">
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('tripDetail.subtotal')}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatPrice(Number(detail.total_amount))}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('tripDetail.taxes')}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatPrice(taxes)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('tripDetail.serviceFee')}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatPrice(serviceFee)}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      {t('tripDetail.totalDue')}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {formatPrice(totalPaid)}
                    </Typography>
                  </Box>

                  {nights.length > 0 && (
                    <>
                      <Divider />
                      <Typography variant="body2" fontWeight={700}>
                        {t('tripDetail.nightlyBreakdown')}
                      </Typography>
                      <Stack spacing={0.75}>
                        {nights.map((n) => (
                          <Box
                            key={n.day}
                            sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              {formatTripDate(n.day)}
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatPrice(Number(n.price))}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )}

          {refund?.status === 'SUCCEEDED' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} color="success.dark" sx={{ mb: 1 }}>
                ✓ {t('tripDetail.refundIssued')}
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('tripDetail.totalPaid')}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatPrice(totalPaid)}
                  </Typography>
                </Box>
                <Tooltip title={t('tripDetail.refundTooltip')}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="success.dark" sx={{ cursor: 'help' }}>
                      {t('tripDetail.refundIssued')}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="success.dark">
                      +{formatPrice(Number(refund.amount))}
                    </Typography>
                  </Box>
                </Tooltip>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" fontWeight={700} color="success.dark">
                    {t('tripDetail.finalTotal')}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="success.dark">
                    {formatPrice(Number(finalTotal))}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </Box>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        {t('tripDetail.room')}
      </Typography>
      <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography fontWeight={600}>{hotel?.name ?? 'Property'}</Typography>
        {roomName && (
          <Typography variant="body2" color="text.secondary">
            {roomName}
          </Typography>
        )}
        <Typography variant="body2" sx={{ mt: 1 }}>
          {formatPrice(Number(detail.unit_price))} / night · Total{' '}
          {formatPrice(Number(detail.total_amount))}
        </Typography>
      </Box>

      {detail.policy_type_applied && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          {t('tripDetail.cancellationPolicyApplied', { type: detail.policy_type_applied })}
          {detail.policy_hours_limit_applied != null
            ? t('tripDetail.cancellationPolicyHoursLimit', {
                hours: detail.policy_hours_limit_applied,
              })
            : ''}
        </Typography>
      )}

      {canCancel && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mt: 3 }}
          alignItems={{ sm: 'center' }}
        >
          <Button
            variant="outlined"
            color="error"
            disabled={cancelling}
            onClick={() => void handleCancelReservation()}
            sx={{ textTransform: 'none', alignSelf: { xs: 'stretch', sm: 'auto' } }}
          >
            {t('tripDetail.cancelBooking')}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {t('tripDetail.cancelBookingHint')}
          </Typography>
        </Stack>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={8000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default function BookingDetailPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <Container maxWidth="md" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress aria-label={t('a11y.loading')} />
        </Container>
      }
    >
      <BookingDetailContent />
    </Suspense>
  );
}
