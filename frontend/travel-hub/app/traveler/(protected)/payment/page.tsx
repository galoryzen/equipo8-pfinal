'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  CartConflictError,
  checkoutBooking,
  createCartBooking,
  getBookingDetail,
  saveBookingGuests,
} from '@/app/lib/api/booking';
import type { CartBooking } from '@/app/lib/types/booking';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
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
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
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

function formatExpiryInput(digits: string): string {
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
}

function isExpiryInPast(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10) + 2000;
  const now = new Date();

  const isYearValid = year >= now.getFullYear();
  const isMonthValid = month > 0 && month <= 12;

  return !isYearValid || !isMonthValid;
}

interface AdditionalGuest {
  id: string;
  firstName: string;
  lastName: string;
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
  const [conflictBookingId, setConflictBookingId] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [expired, setExpired] = useState(false);
  const [isResumed, setIsResumed] = useState(false);

  // Guest details form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Processing / snackbar
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Additional guests (non-primary)
  const [additionalGuests, setAdditionalGuests] = useState<AdditionalGuest[]>([]);

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

  const guestDetailsFilled = useMemo(
    () =>
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      phone.trim().length > 0,
    [firstName, lastName, email, phone]
  );

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
          if (e instanceof CartConflictError) {
            setConflictBookingId(e.existingBookingId);
          }
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

  const handlePay = useCallback(async () => {
    if (!bookingId) return;
    setIsProcessing(true);
    setProcessingProgress(10);

    try {
      // 0. Read current booking status — save-guests requires CART state,
      //    but a previous failed attempt may have already moved it to PENDING_PAYMENT.
      const current = await getBookingDetail(bookingId);
      setProcessingProgress(20);

      if (current.status === 'CART') {
        // 1. Save guests (only valid in CART state)
        const guests = [
          {
            is_primary: true,
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            email: email.trim(),
            phone: phone.trim(),
          },
          ...additionalGuests.map((g) => ({
            is_primary: false,
            full_name: `${g.firstName.trim()} ${g.lastName.trim()}`,
            email: null,
            phone: null,
          })),
        ];
        await saveBookingGuests(bookingId, guests);
        setProcessingProgress(45);

        // 2. Checkout (CART → PENDING_PAYMENT)
        await checkoutBooking(bookingId);
        setProcessingProgress(65);
      } else if (current.status === 'PENDING_PAYMENT') {
        // Already past checkout from a previous attempt — skip straight to payment intent
        setProcessingProgress(65);
      } else {
        throw new Error(`${t('payment.paymentError')} (status: ${current.status})`);
      }

      setProcessingProgress(80);

      // 4. Poll until the payment worker transitions the booking out of PENDING_PAYMENT.
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const detail = await getBookingDetail(bookingId);

        const isSuccess = detail.status === 'PENDING_CONFIRMATION' || detail.status === 'CONFIRMED';

        if (isSuccess) {
          setProcessingProgress(100);
          await new Promise((r) => setTimeout(r, 600));
          const confirmParams = new URLSearchParams({
            booking_id: bookingId,
            property_name: propertyName,
            room_name: roomName,
            image_url: imageUrl,
            checkin,
            checkout,
            guests: String(guests),
            unit_price: unitPrice,
            currency,
            guest_name: `${firstName.trim()} ${lastName.trim()}`,
            guest_email: email.trim(),
            ...(cardNumber.length >= 4 && {
              card_last4: cardNumber.replace(/\s/g, '').slice(-4),
              card_brand: 'Visa',
            }),
          });
          router.push(`/traveler/payment/confirmation?${confirmParams.toString()}`);
          return;
        }

        if (detail.status === 'REJECTED' || detail.status === 'CANCELLED') {
          throw new Error(t('payment.paymentRejected'));
        }
        // PENDING_PAYMENT → still waiting for the event bus; keep polling
      }
      throw new Error(t('payment.paymentTimeout'));
    } catch (err) {
      setIsProcessing(false);
      setProcessingProgress(0);
      setSnackbarMessage(err instanceof Error ? err.message : t('payment.paymentError'));
      setSnackbarOpen(true);
    }
  }, [
    bookingId,
    firstName,
    lastName,
    email,
    phone,
    additionalGuests,
    router,
    t,
    cardNumber,
    checkin,
    checkout,
    currency,
    guests,
    imageUrl,
    propertyName,
    roomName,
    unitPrice,
  ]);

  const expiryError = expiry.length === 5 && isExpiryInPast(expiry);

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
    const resumeParams = conflictBookingId
      ? new URLSearchParams({
          booking_id: conflictBookingId,
          property_id: propertyId,
          room_type_id: roomTypeId,
          rate_plan_id: ratePlanId,
          checkin,
          checkout,
          guests: String(guests),
          unit_price: unitPrice,
          currency,
          property_name: propertyName,
          room_name: roomName,
          ...(imageUrl && { image_url: imageUrl }),
        })
      : null;

    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {initError}
        </Alert>
        <Stack spacing={2} direction="row" flexWrap="wrap">
          {resumeParams && (
            <Button
              component={NextLink}
              href={`/traveler/payment?${resumeParams.toString()}`}
              variant="contained"
              sx={{ textTransform: 'none' }}
            >
              {t('payment.resumeReservation')}
            </Button>
          )}
          <Button
            component={NextLink}
            href="/traveler/search"
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            {t('payment.backToSearch')}
          </Button>
        </Stack>
      </Container>
    );
  }

  const countdownSeverity = remainingMs < 2 * 60 * 1000 ? 'error' : 'warning';

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 6 }}>
      {/* ── Processing overlay ── */}
      <Backdrop
        open={isProcessing}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 2, bgcolor: 'grey.50' }}
      >
        <Container maxWidth="sm" sx={{ textAlign: 'center', py: 6 }}>
          <Box
            sx={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              border: '3px solid',
              borderColor: 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 4,
            }}
          >
            <CircularProgress size={48} thickness={3} />
          </Box>

          <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5, letterSpacing: '-0.02em' }}>
            {t('payment.processingTitle')}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {t('payment.processingBody')}{' '}
            <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
              {propertyName}
            </Box>
            {'. '}
            {t('payment.processingNote')}
          </Typography>

          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="primary.main" fontWeight={600}>
                {t('payment.processingStatus')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {processingProgress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={processingProgress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
            {[
              {
                icon: '🛡️',
                label: t('payment.processingFeature1Title'),
                desc: t('payment.processingFeature1Desc'),
              },
              {
                icon: '💳',
                label: t('payment.processingFeature2Title'),
                desc: t('payment.processingFeature2Desc'),
              },
              {
                icon: '🎧',
                label: t('payment.processingFeature3Title'),
                desc: t('payment.processingFeature3Desc'),
              },
            ].map((f) => (
              <Grid key={f.label} size={{ xs: 12, sm: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ mb: 0.5 }}>
                    {f.icon}
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {f.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {f.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Typography variant="caption" color="text.secondary">
            {t('payment.processingWarning')}
          </Typography>
        </Container>
      </Backdrop>

      {/* ── Error snackbar ── */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnackbarOpen(false)} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

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

                  {/* Primary guest */}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{
                      mb: 1,
                      display: 'block',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {t('payment.primaryGuest')}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label={t('payment.firstName')}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        fullWidth
                        size="small"
                        required
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label={t('payment.lastName')}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        fullWidth
                        size="small"
                        required
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
                        required
                        error={email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
                        helperText={
                          email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                            ? t('payment.emailInvalid')
                            : t('payment.emailHelper')
                        }
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
                        required
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

                  {/* Additional guests */}
                  {additionalGuests.length > 0 && (
                    <Stack spacing={2} sx={{ mt: 3 }}>
                      {additionalGuests.map((ag, idx) => (
                        <Box key={ag.id}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              mb: 1,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={600}
                              sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            >
                              {t('payment.additionalGuest')} {idx + 1}
                            </Typography>
                            <IconButton
                              size="small"
                              aria-label="remove guest"
                              onClick={() =>
                                setAdditionalGuests((prev) => prev.filter((g) => g.id !== ag.id))
                              }
                              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                            >
                              ✕
                            </IconButton>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <TextField
                                label={t('payment.firstName')}
                                value={ag.firstName}
                                onChange={(e) =>
                                  setAdditionalGuests((prev) =>
                                    prev.map((g) =>
                                      g.id === ag.id ? { ...g, firstName: e.target.value } : g
                                    )
                                  )
                                }
                                fullWidth
                                size="small"
                                required
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <TextField
                                label={t('payment.lastName')}
                                value={ag.lastName}
                                onChange={(e) =>
                                  setAdditionalGuests((prev) =>
                                    prev.map((g) =>
                                      g.id === ag.id ? { ...g, lastName: e.target.value } : g
                                    )
                                  )
                                }
                                fullWidth
                                size="small"
                                required
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                    </Stack>
                  )}

                  {/* Add guest button */}
                  {additionalGuests.length < 19 && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        setAdditionalGuests((prev) => [
                          ...prev,
                          { id: crypto.randomUUID(), firstName: '', lastName: '' },
                        ])
                      }
                      sx={{ mt: 3, textTransform: 'none', fontWeight: 600, borderStyle: 'dashed' }}
                    >
                      + {t('payment.addGuest')}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  opacity: guestDetailsFilled ? 1 : 0.55,
                  pointerEvents: guestDetailsFilled ? 'auto' : 'none',
                  transition: 'opacity 0.2s',
                }}
              >
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
                      {guestDetailsFilled ? '💳' : '🔒'} {t('payment.paymentMethod')}
                    </Typography>
                    <Chip
                      label={t('payment.secure')}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>

                  {!guestDetailsFilled && (
                    <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                      {t('payment.fillGuestDetailsFirst')}
                    </Alert>
                  )}

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
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
                          setCardNumber(formatted);
                        }}
                        fullWidth
                        size="small"
                        inputProps={{ maxLength: 19 }}
                      />
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            label={t('payment.expiryDate')}
                            placeholder="MM/YY"
                            value={expiry}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setExpiry(formatExpiryInput(digits));
                            }}
                            fullWidth
                            size="small"
                            inputProps={{ maxLength: 5 }}
                            error={expiryError}
                            helperText={expiryError ? t('payment.expiryInPast') : undefined}
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
                    startIcon={<CreateOutlinedIcon fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      p: 0,
                      mt: 0.5,
                      color: 'primary.main',
                      fontWeight: 600,
                      minWidth: 0,
                    }}
                  >
                    {t('payment.editBooking')}
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
                  disabled={expired || !guestDetailsFilled || expiryError}
                  onClick={handlePay}
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
