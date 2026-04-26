'use client';

import { Suspense, useEffect, useState } from 'react';

import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';

import { getBookingDetail } from '@/app/lib/api/booking';
import { formatBookingRef, formatTripDate } from '@/app/lib/myTrips/formatting';
import { fetchPropertyDetailsMap } from '@/app/lib/myTrips/loadPropertyDetails';
import { statusChipProps } from '@/app/lib/myTrips/statusLabels';
import type { BookingDetail } from '@/app/lib/types/booking';
import type { PropertyDetail } from '@/app/lib/types/catalog';
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
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

function BookingDetailContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId')?.trim() ?? '';

  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [propertyById, setPropertyById] = useState<Record<string, PropertyDetail | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const hotel = propertyById[detail.property_id] ?? null;
  const roomName = hotel?.room_types?.find((r) => r.id === detail.room_type_id)?.name;
  const grandTotal = detail.grand_total ?? detail.total_amount;
  const taxes = detail.taxes ?? '0';
  const serviceFee = detail.service_fee ?? '0';
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
            {grandTotal} {detail.currency_code}
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
                      {detail.total_amount} {detail.currency_code}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('tripDetail.taxes')}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {taxes} {detail.currency_code}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('tripDetail.serviceFee')}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {serviceFee} {detail.currency_code}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      {t('tripDetail.totalDue')}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {grandTotal} {detail.currency_code}
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
                              {n.price} {detail.currency_code}
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
          {detail.unit_price} {detail.currency_code} / night · Total {detail.total_amount}{' '}
          {detail.currency_code}
        </Typography>
      </Box>

      {detail.policy_type_applied && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Cancellation policy applied: {detail.policy_type_applied}
          {detail.policy_hours_limit_applied != null
            ? ` · ${detail.policy_hours_limit_applied}h limit`
            : ''}
        </Typography>
      )}
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
