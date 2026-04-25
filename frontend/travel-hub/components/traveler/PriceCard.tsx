'use client';

import { useEffect, useState } from 'react';

import { RateUnavailableError, getRatePlanPricing } from '@/app/lib/api/catalog';
import { useAuthAction } from '@/app/lib/hooks/useAuthAction';
import type { PropertyDetail, RatePlanPricing } from '@/app/lib/types/catalog';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import type { SelectedRoomInfo } from '@/components/traveler/PropertyDetailView';

interface PriceCardProps {
  property: PropertyDetail;
  minPrice: number | null;
  selectedRoom: SelectedRoomInfo | null;
  onDatesChange?: (checkin: string, checkout: string) => void;
}

function nightsBetween(checkin: string, checkout: string) {
  const a = new Date(checkin);
  const b = new Date(checkout);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

function getDefaultDates() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
  return { today: todayStr, tomorrow: tomorrowStr };
}

export default function PriceCard({
  property,
  minPrice,
  selectedRoom,
  onDatesChange,
}: PriceCardProps) {
  const { today, tomorrow } = getDefaultDates();
  const { authStatus, requireAuth } = useAuthAction();
  const { t } = useTranslation();

  const [checkin, setCheckin] = useState(today);
  const [checkout, setCheckout] = useState(tomorrow);
  const [guests, setGuests] = useState(2);

  const nights = nightsBetween(checkin, checkout);

  // Authoritative per-night pricing from the catalog. Refetched whenever the
  // user changes dates or picks a different rate plan. ``selectedRoom.unitPrice``
  // is only a fallback while pricing is loading or for the initial header.
  const [pricingResult, setPricingResult] = useState<{
    key: string | null;
    data: RatePlanPricing | null;
    error: string | null;
  }>({ key: null, data: null, error: null });
  const ratePlanId = selectedRoom?.ratePlanId;

  const pricingQueryKey =
    ratePlanId && checkin && checkout && nights > 0 ? `${ratePlanId}:${checkin}:${checkout}` : null;

  useEffect(() => {
    if (!pricingQueryKey || !ratePlanId) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await getRatePlanPricing(ratePlanId, checkin, checkout);
        if (cancelled) return;
        setPricingResult({ key: pricingQueryKey, data, error: null });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof RateUnavailableError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not load pricing';
        setPricingResult({ key: pricingQueryKey, data: null, error: message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pricingQueryKey, ratePlanId, checkin, checkout]);

  const pricing =
    pricingQueryKey && pricingResult.key === pricingQueryKey ? pricingResult.data : null;
  const pricingError =
    pricingQueryKey && pricingResult.key === pricingQueryKey ? pricingResult.error : null;

  const fallbackPricePerNight = selectedRoom?.unitPrice ?? minPrice ?? 0;
  const roomTotal = pricing
    ? Number(pricing.subtotal)
    : fallbackPricePerNight * Math.max(nights, 1);
  const pricePerNight = pricing && nights > 0 ? roomTotal / nights : fallbackPricePerNight;
  // Fees come from the server (shared.pricing constants) so this card matches
  // the cart and payment-page totals exactly. Pre-pricing fallback is 0; the
  // Reserve button is disabled while pricing loads anyway.
  const taxes = pricing ? Number(pricing.taxes) : 0;
  const serviceFee = pricing ? Number(pricing.service_fee) : 0;
  const total = pricing ? Number(pricing.total) : roomTotal;

  const canReserve =
    Boolean(selectedRoom) && Boolean(pricingQueryKey) && !pricingError && !!pricing;

  function handleCheckinChange(val: string) {
    setCheckin(val);
    if (val >= checkout) {
      const next = new Date(new Date(val).getTime() + 86400000).toISOString().split('T')[0];
      setCheckout(next);
      onDatesChange?.(val, next);
    } else {
      onDatesChange?.(val, checkout);
    }
  }

  function handleCheckoutChange(val: string) {
    setCheckout(val);
    onDatesChange?.(checkin, val);
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 3, position: 'sticky', top: 24 }}>
      {/* Price header */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: selectedRoom ? 0.5 : 2 }}>
        {pricePerNight > 0 ? (
          <>
            <Typography variant="h5" fontWeight={700}>
              ${pricePerNight.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              / night
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Price not available
          </Typography>
        )}
      </Box>
      {selectedRoom && (
        <Typography
          variant="caption"
          color="primary.main"
          fontWeight={600}
          sx={{ display: 'block', mb: 2 }}
        >
          {selectedRoom.roomName}
        </Typography>
      )}

      {/* Date pickers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1.5 }}>
        <TextField
          label="Check-in"
          type="date"
          size="small"
          value={checkin}
          inputProps={{ min: today }}
          onChange={(e) => handleCheckinChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
        <TextField
          label="Check-out"
          type="date"
          size="small"
          value={checkout}
          inputProps={{ min: checkin }}
          onChange={(e) => handleCheckoutChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      {/* Guests */}
      <TextField
        label="Guests"
        type="number"
        size="small"
        fullWidth
        value={guests}
        inputProps={{ min: 1, max: 20 }}
        onChange={(e) => setGuests(Number(e.target.value))}
        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
      />

      {/* Reserve button */}
      <Button
        variant="contained"
        fullWidth
        size="large"
        disableElevation
        disabled={authStatus === 'loading' || !canReserve}
        startIcon={
          authStatus === 'loading' ? (
            <CircularProgress aria-label={t('a11y.loading')} size={16} sx={{ color: 'white' }} />
          ) : authStatus === 'unauthenticated' ? (
            <LockOutlinedIcon sx={{ fontSize: 18 }} />
          ) : undefined
        }
        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, mb: 1 }}
        onClick={() => {
          if (!selectedRoom) return;
          const params = new URLSearchParams({
            property_id: property.id,
            room_type_id: selectedRoom.roomTypeId,
            rate_plan_id: selectedRoom.ratePlanId,
            checkin,
            checkout,
            guests: String(guests),
            currency: pricing?.currency_code ?? 'USD',
            property_name: property.name,
            room_name: selectedRoom.roomName,
          });
          requireAuth(`/traveler/booking?${params.toString()}`);
        }}
      >
        {authStatus === 'unauthenticated' ? 'Sign in to Reserve' : 'Reserve'}
      </Button>

      {!selectedRoom && (
        <Alert severity="info" sx={{ mb: 1, py: 0.5 }}>
          Select a room below to continue
        </Alert>
      )}

      {pricingError && (
        <Alert severity="error" sx={{ mb: 1, py: 0.5 }}>
          {pricingError}
        </Alert>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', mb: 2 }}
      >
        You won&apos;t be charged yet
      </Typography>

      {/* Price breakdown — single line; ``pricePerNight`` is the average derived
          from the authoritative breakdown, so the math always reconciles to the
          total even when nightly rates vary. */}
      {pricePerNight > 0 && nights > 0 && (
        <>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                ${pricePerNight.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}
              </Typography>
              <Typography variant="body2">${roomTotal.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Taxes
              </Typography>
              <Typography variant="body2">${taxes.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Service fee
              </Typography>
              <Typography variant="body2">${serviceFee.toLocaleString()}</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight={700}>
                Total
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                ${total.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </>
      )}

      {/* Hosted by */}
      <Box
        sx={{
          mt: 2,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: 'grey.300',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: 'text.secondary',
          }}
        >
          🏨
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Hosted by
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {property.name}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
