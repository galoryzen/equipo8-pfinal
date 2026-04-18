'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { createCartBooking, getBookingDetail } from '@/app/lib/api/booking';
import type { CartBooking } from '@/app/lib/types/booking';
import Alert from '@mui/material/Alert';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

const SERVICE_FEE = 35;
const TAX_RATE = 0.12;
const LS_PREFIX = 'travelhub_cart_';

function lsKey(propertyId: string, roomTypeId: string, checkin: string, checkout: string): string {
  return `${LS_PREFIX}${propertyId}_${roomTypeId}_${checkin}_${checkout}`;
}

function toUtcDate(s: string): Date {
  return new Date(s.endsWith('Z') || s.includes('+') ? s : `${s}Z`);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function PaymentPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const propertyId = searchParams.get('property_id') ?? '';
  const roomTypeId = searchParams.get('room_type_id') ?? '';
  const ratePlanId = searchParams.get('rate_plan_id') ?? '';
  const checkin = searchParams.get('checkin') ?? '';
  const checkout = searchParams.get('checkout') ?? '';
  const guests = Number(searchParams.get('guests') ?? '1');
  const unitPrice = searchParams.get('unit_price') ?? '0';
  const currency = searchParams.get('currency') ?? 'USD';
  const propertyName = searchParams.get('property_name') ?? 'Your Hotel';
  const roomName = searchParams.get('room_name') ?? 'Room';
  const imageUrl = searchParams.get('image_url') ?? '';

  const [bookingId, setBookingId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [expired, setExpired] = useState(false);
  const [isResumed, setIsResumed] = useState(false);

  // Guest details form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Payment method
  const [paymentTab, setPaymentTab] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');

  const mountedRef = useRef(true);

  // Price calculations
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

  const handleBookingResolved = useCallback(
    (id: string, expAt: string, status: string) => {
      if (status === 'EXPIRED') {
        setExpired(true);
        setLoading(false);
        const key = lsKey(propertyId, roomTypeId, checkin, checkout);
        localStorage.removeItem(key);
        return;
      }
      setBookingId(id);
      setExpiresAt(expAt);
      setLoading(false);
    },
    [propertyId, roomTypeId, checkin, checkout]
  );

  // Countdown effect — driven by expiresAt
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const ms = toUtcDate(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setRemainingMs(0);
        setExpired(true);
      } else {
        setRemainingMs(ms);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  // Mount init — three-path logic
  useEffect(() => {
    mountedRef.current = true;
    const key = lsKey(propertyId, roomTypeId, checkin, checkout);

    async function init() {
      setLoading(true);
      setInitError(null);

      // Path 1: booking_id already in URL (refresh)
      const urlBookingId = searchParams.get('booking_id');
      if (urlBookingId) {
        try {
          const b = await getBookingDetail(urlBookingId);
          if (!mountedRef.current) return;
          setIsResumed(true);
          handleBookingResolved(b.id, b.hold_expires_at ?? '', b.status);
          return;
        } catch {
          // fall through
        }
      }

      // Path 2: booking_id in localStorage (tab/browser closed and reopened)
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const b = await getBookingDetail(stored);
          if (!mountedRef.current) return;
          if (b.status !== 'EXPIRED' && b.hold_expires_at) {
            setIsResumed(true);
            handleBookingResolved(b.id, b.hold_expires_at, b.status);
            const params = new URLSearchParams(searchParams.toString());
            params.set('booking_id', stored);
            router.replace(`/traveler/payment?${params.toString()}`);
            return;
          }
          localStorage.removeItem(key);
        } catch {
          localStorage.removeItem(key);
        }
      }

      // Path 3: create a new CART booking (idempotent on backend)
      if (!propertyId || !roomTypeId || !ratePlanId || !checkin || !checkout) {
        if (mountedRef.current) {
          setInitError('Missing booking parameters. Please go back and select a room.');
          setLoading(false);
        }
        return;
      }

      try {
        const newBooking: CartBooking = await createCartBooking({
          checkin,
          checkout,
          currency_code: currency,
          property_id: propertyId,
          room_type_id: roomTypeId,
          rate_plan_id: ratePlanId,
          unit_price: unitPrice,
        });
        if (!mountedRef.current) return;
        localStorage.setItem(key, newBooking.id);
        setIsResumed(false);
        handleBookingResolved(newBooking.id, newBooking.hold_expires_at, newBooking.status);
        const params = new URLSearchParams(searchParams.toString());
        params.set('booking_id', newBooking.id);
        router.replace(`/traveler/payment?${params.toString()}`);
      } catch (e) {
        if (mountedRef.current) {
          setInitError(e instanceof Error ? e.message : 'Could not create booking hold.');
          setLoading(false);
        }
      }
    }

    void init();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // visibilitychange — re-sync on tab return
  useEffect(() => {
    if (!bookingId) return;
    const key = lsKey(propertyId, roomTypeId, checkin, checkout);

    const handleVisibility = async () => {
      if (document.hidden) return;
      try {
        const b = await getBookingDetail(bookingId);
        if (mountedRef.current) {
          handleBookingResolved(b.id, b.hold_expires_at ?? '', b.status);
        }
      } catch {
        if (mountedRef.current) {
          localStorage.removeItem(key);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [bookingId, propertyId, roomTypeId, checkin, checkout, handleBookingResolved]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography color="text.secondary">{t('payment.preparing')}</Typography>
        </Stack>
      </Container>
    );
  }

  if (initError) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {initError}
        </Alert>
        <Button
          component={NextLink}
          href="/traveler/search"
          variant="outlined"
          sx={{ textTransform: 'none' }}
        >
          {t('payment.backToSearch')}
        </Button>
      </Container>
    );
  }

  const countdownSeverity = remainingMs < 2 * 60 * 1000 ? 'error' : 'warning';

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 6 }}>
      {/* Expired overlay */}
      <Backdrop open={expired} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Paper
          elevation={8}
          sx={{
            p: 5,
            maxWidth: 420,
            mx: 2,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            {t('payment.expiredTitle')}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {t('payment.expiredBody')}
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              component={NextLink}
              href="/traveler/search"
              variant="contained"
              sx={{ textTransform: 'none' }}
            >
              {t('payment.newSearch')}
            </Button>
            <Button
              component={NextLink}
              href="/traveler/my-trips"
              variant="outlined"
              sx={{ textTransform: 'none' }}
            >
              {t('payment.myTrips')}
            </Button>
          </Stack>
        </Paper>
      </Backdrop>

      {/* Page header */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          py: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Button
          component={NextLink}
          href={propertyId ? `/traveler/hotel?id=${propertyId}` : '/traveler/search'}
          variant="text"
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t('payment.backLink')}
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            🔒
          </Typography>
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            {t('payment.secureCheckout')}
          </Typography>
        </Box>
      </Box>

      {/* Countdown banner */}
      {!expired && expiresAt && (
        <Alert
          severity={countdownSeverity}
          sx={{
            borderRadius: 0,
            justifyContent: 'center',
            '& .MuiAlert-message': { textAlign: 'center' },
          }}
        >
          {t('payment.countdownBannerBefore')}{' '}
          <Box component="span" fontWeight={700}>
            {formatCountdown(remainingMs)}
          </Box>{' '}
          {t('payment.countdownBannerAfter')}
        </Alert>
      )}

      {/* Resume banner — shown when continuing a previous hold */}
      {isResumed && !expired && (
        <Alert
          severity="info"
          sx={{
            borderRadius: 0,
            justifyContent: 'center',
            '& .MuiAlert-message': { textAlign: 'center' },
          }}
        >
          {t('payment.resumeBanner')}
        </Alert>
      )}

      <Container maxWidth="lg" sx={{ pt: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          fontWeight={800}
          sx={{ mb: 4, letterSpacing: '-0.02em' }}
        >
          {t('payment.pageTitle')}
        </Typography>

        <Grid container spacing={4}>
          {/* ── Left column ── */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={3}>
              {/* Guest Details */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 3,
                    }}
                  >
                    <Typography variant="h6" fontWeight={700}>
                      👤 {t('payment.guestDetails')}
                    </Typography>
                    <Button
                      component={NextLink}
                      href="/traveler/login"
                      variant="text"
                      size="small"
                      sx={{ textTransform: 'none', color: 'primary.main', fontWeight: 600 }}
                    >
                      {t('payment.logIn')}
                    </Button>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label={t('payment.firstName')}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label={t('payment.lastName')}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label={t('payment.emailAddress')}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        fullWidth
                        size="small"
                        helperText={t('payment.emailHelper')}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label={t('payment.phoneNumber')}
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        fullWidth
                        size="small"
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <Typography variant="body2" color="text.secondary">
                                  🇺🇸 +1
                                </Typography>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" fontWeight={700}>
                      💳 {t('payment.paymentMethod')}
                    </Typography>
                    <Chip
                      label={t('payment.secure')}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>

                  <Tabs
                    value={paymentTab}
                    onChange={(_, v) => setPaymentTab(v)}
                    sx={{
                      mb: 3,
                      borderBottom: 1,
                      borderColor: 'divider',
                      '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
                    }}
                  >
                    <Tab label={t('payment.creditOrDebitCard')} />
                    <Tab label={t('payment.paypal')} />
                  </Tabs>

                  {paymentTab === 0 ? (
                    <Stack spacing={2}>
                      <TextField
                        label={t('payment.cardNumber')}
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        fullWidth
                        size="small"
                        inputProps={{ maxLength: 19 }}
                      />
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            label={t('payment.expiryDate')}
                            placeholder="MM / YY"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                            fullWidth
                            size="small"
                            inputProps={{ maxLength: 7 }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            label={t('payment.cvv')}
                            placeholder="123"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                            fullWidth
                            size="small"
                            inputProps={{ maxLength: 4 }}
                            type="password"
                          />
                        </Grid>
                      </Grid>
                      <TextField
                        label={t('payment.nameOnCard')}
                        placeholder={t('payment.fullName')}
                        value={nameOnCard}
                        onChange={(e) => setNameOnCard(e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Stack>
                  ) : (
                    <Box
                      sx={{
                        py: 4,
                        textAlign: 'center',
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px dashed',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography color="text.secondary">{t('payment.paypalRedirect')}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* ── Right column ── */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card
              variant="outlined"
              sx={{ borderRadius: 2, overflow: 'hidden', position: 'sticky', top: 16 }}
            >
              {/* Hotel image */}
              <Box
                sx={{
                  height: 180,
                  bgcolor: imageUrl ? 'transparent' : 'primary.dark',
                  backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'flex-end',
                  p: 2,
                  position: 'relative',
                  '&::after': imageUrl
                    ? {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)',
                      }
                    : {},
                }}
              >
                {!imageUrl && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(135deg, var(--mui-palette-primary-dark) 0%, var(--mui-palette-primary-main) 100%)',
                    }}
                  />
                )}
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: 'white' }}>
                    {propertyName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                    ★ 5.0
                  </Typography>
                </Box>
              </Box>

              <CardContent sx={{ p: 3 }}>
                {/* Booking Summary */}
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  {t('payment.bookingSummary')}
                </Typography>

                <Box sx={{ mt: 1.5, mb: 2 }}>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ color: 'primary.main', mb: 0.5 }}
                  >
                    📅 {checkin ? formatDateShort(checkin) : '—'} –{' '}
                    {checkout ? formatDateShort(checkout) : '—'}
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {roomName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('payment.night', { count: nights })} •{' '}
                    {t('payment.guest', { count: guests })}
                  </Typography>
                  <Button
                    component={NextLink}
                    href={propertyId ? `/traveler/hotel?id=${propertyId}` : '/traveler/search'}
                    variant="text"
                    size="small"
                    sx={{
                      textTransform: 'none',
                      p: 0,
                      mt: 0.5,
                      color: 'primary.main',
                      fontWeight: 600,
                      minWidth: 0,
                    }}
                  >
                    ✏️ {t('payment.editBooking')}
                  </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Price Details */}
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  {t('payment.priceDetails')}
                </Typography>

                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('payment.basePrice', { count: nights })}
                    </Typography>
                    <Typography variant="body2">
                      ${parseFloat(unitPrice).toFixed(2)} × {nights}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('payment.taxesAndFees')}
                    </Typography>
                    <Typography variant="body2">${taxes.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('payment.serviceFee')}
                    </Typography>
                    <Typography variant="body2">${SERVICE_FEE.toFixed(2)}</Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      {t('payment.total', { currency })}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      {t('payment.freeCancellationUntil', {
                        date: checkin ? formatDate(checkin) : '—',
                      })}
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={800} color="primary.main">
                    ${displayTotal.toFixed(2)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Policies */}
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    ℹ️{' '}
                    <Box component="span" fontWeight={600} color="text.primary">
                      {t('payment.cancellationPolicyLabel')}
                    </Box>{' '}
                    {t('payment.cancellationPolicyText')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ℹ️{' '}
                    <Box component="span" fontWeight={600} color="text.primary">
                      {t('payment.checkinPolicyLabel')}
                    </Box>{' '}
                    {t('payment.checkinPolicyText')}
                  </Typography>
                </Stack>

                {/* Security badge */}
                <Alert severity="success" sx={{ mb: 2, py: 0.5 }}>
                  {t('payment.securityBadge')}
                </Alert>

                {/* Pay button */}
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={expired}
                  sx={{ textTransform: 'none', fontWeight: 700, py: 1.5, borderRadius: 2 }}
                >
                  🔒 {t('payment.payButton', { amount: displayTotal.toFixed(2) })}
                </Button>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  textAlign="center"
                  sx={{ mt: 1 }}
                >
                  {t('payment.terms')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default function TravelerPaymentPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      }
    >
      <PaymentPageContent />
    </Suspense>
  );
}
