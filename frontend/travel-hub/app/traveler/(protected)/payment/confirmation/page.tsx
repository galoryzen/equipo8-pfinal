'use client';

import { Suspense, useMemo } from 'react';

import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';

import BedroomParentOutlinedIcon from '@mui/icons-material/BedroomParentOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const SERVICE_FEE = 35;
const TAX_RATE = 0.12;

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ConfirmationPageContent() {
  const searchParams = useSearchParams();

  const bookingId = searchParams.get('booking_id') ?? '';
  const propertyName = searchParams.get('property_name') ?? 'Your Hotel';
  const roomName = searchParams.get('room_name') ?? 'Room';
  const imageUrl = searchParams.get('image_url') ?? '';
  const checkin = searchParams.get('checkin') ?? '';
  const checkout = searchParams.get('checkout') ?? '';
  const guests = Number(searchParams.get('guests') ?? '1');
  const unitPrice = searchParams.get('unit_price') ?? '0';
  const currency = searchParams.get('currency') ?? 'USD';
  const guestName = searchParams.get('guest_name') ?? '';
  const guestEmail = searchParams.get('guest_email') ?? '';
  const cardLast4 = searchParams.get('card_last4') ?? '';
  const cardBrand = searchParams.get('card_brand') ?? 'Card';
  const rating = searchParams.get('rating') ?? '4.9';

  const nights = useMemo(() => {
    if (!checkin || !checkout) return 0;
    const a = new Date(checkin + 'T00:00:00');
    const b = new Date(checkout + 'T00:00:00');
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
  }, [checkin, checkout]);

  const basePrice = useMemo(() => parseFloat(unitPrice) * nights, [unitPrice, nights]);
  const taxes = useMemo(() => parseFloat((basePrice * TAX_RATE).toFixed(2)), [basePrice]);
  const displayTotal = useMemo(
    () => parseFloat((basePrice + taxes + SERVICE_FEE).toFixed(2)),
    [basePrice, taxes]
  );

  const currencySymbol = currency === 'USD' ? '$' : currency;

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 6 }}>
      <Container maxWidth="md" sx={{ pt: 5 }}>
        {/* ── Status card ── */}
        <Card
          variant="outlined"
          sx={{ borderRadius: 3, mb: 3, textAlign: 'center', px: { xs: 3, sm: 6 }, py: 4 }}
        >
          {/* Animated icon */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: '2.5px solid',
              borderColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              color: 'primary.main',
            }}
          >
            <CheckBoxOutlinedIcon sx={{ fontSize: 40 }} />
          </Box>

          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 1 }}>
            Reservation Pending
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 480, mx: 'auto' }}>
            Almost there! We are finalising your booking with the property. Please wait a moment
            while we secure your stay.
          </Typography>

          {/* Progress bar */}
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="primary.main" fontWeight={600}>
                Finalizing details...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                85%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={85} sx={{ height: 8, borderRadius: 4 }} />
          </Box>
        </Card>

        {/* ── Booking details card ── */}
        <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
            {/* Hotel image */}
            <Box
              sx={{
                width: { xs: '100%', sm: 280 },
                height: { xs: 180, sm: 'auto' },
                minHeight: { sm: 160 },
                flexShrink: 0,
                bgcolor: imageUrl ? 'transparent' : 'primary.dark',
                backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!imageUrl && (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    background:
                      'linear-gradient(135deg, var(--mui-palette-primary-dark) 0%, var(--mui-palette-primary-main) 100%)',
                  }}
                />
              )}
            </Box>

            {/* Details */}
            <CardContent sx={{ p: 3, flex: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 1.5,
                }}
              >
                <Chip
                  label="PENDING CONFIRMATION"
                  size="small"
                  sx={{
                    bgcolor: 'primary.50',
                    color: 'primary.main',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    letterSpacing: '0.04em',
                    borderRadius: 1,
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                  <Typography variant="body2" fontWeight={600}>
                    {rating}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                {propertyName}
              </Typography>

              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CalendarTodayOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {checkin ? formatDate(checkin) : '—'}
                      {checkout ? ` – ${formatDate(checkout)}` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {nights > 0 ? `${nights} Night${nights !== 1 ? 's' : ''} stay` : ''}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <BedroomParentOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {roomName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {guests} Adult{guests !== 1 ? 's' : ''}, 1 Bedroom
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Box>
        </Card>

        {/* ── Price Summary + Guest Information ── */}
        <Grid container spacing={3}>
          {/* Price Summary */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                  <CreditCardOutlinedIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Price Summary
                  </Typography>
                </Box>

                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Nightly rate (x{nights})
                    </Typography>
                    <Typography variant="body2">
                      {currencySymbol}
                      {basePrice.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Service fees
                    </Typography>
                    <Typography variant="body2">
                      {currencySymbol}
                      {SERVICE_FEE.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Taxes
                    </Typography>
                    <Typography variant="body2">
                      {currencySymbol}
                      {taxes.toFixed(2)}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body1" fontWeight={700}>
                    Total Amount
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="primary.main">
                    {currencySymbol}
                    {displayTotal.toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Guest Information */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                  <PersonOutlineOutlinedIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Guest Information
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      bgcolor: 'primary.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <PersonOutlineOutlinedIcon sx={{ color: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      {guestName || 'Primary Guest'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Primary Guest
                    </Typography>
                  </Box>
                </Box>

                <Stack spacing={1.5}>
                  {guestEmail && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <EmailOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          flex: 1,
                          flexWrap: 'wrap',
                          gap: 0.5,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Email:
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                          {guestEmail}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  {cardLast4 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CreditCardOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Payment:
                        </Typography>
                        <Typography variant="body2">
                          {cardBrand} •••• {cardLast4}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Footer actions ── */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            component={NextLink}
            href="/traveler/my-trips"
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700, px: 4, borderRadius: 2 }}
          >
            View My Trips
          </Button>
          <Button
            component={NextLink}
            href="/traveler/search"
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 600, px: 4, borderRadius: 2 }}
          >
            Explore More
          </Button>
        </Box>

        {/* ── Footer ── */}
        <Box sx={{ mt: 5, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            © 2026 TravelHub Inc. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 0.5 }}>
            <Typography
              component={NextLink}
              href="/terms"
              variant="caption"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Terms of Service
            </Typography>
            <Typography
              component={NextLink}
              href="/privacy"
              variant="caption"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Privacy Policy
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="md" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      }
    >
      <ConfirmationPageContent />
    </Suspense>
  );
}
