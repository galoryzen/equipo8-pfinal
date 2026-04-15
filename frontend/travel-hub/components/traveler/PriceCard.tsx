'use client';

import { useState } from 'react';

import { useAuthAction } from '@/app/lib/hooks/useAuthAction';
import type { PropertyDetail } from '@/app/lib/types/catalog';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

interface PriceCardProps {
  property: PropertyDetail;
  minPrice: number | null;
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

export default function PriceCard({ property, minPrice, onDatesChange }: PriceCardProps) {
  const { today, tomorrow } = getDefaultDates();
  const { authStatus, requireAuth } = useAuthAction();
  const { t } = useTranslation();

  const [checkin, setCheckin] = useState(today);
  const [checkout, setCheckout] = useState(tomorrow);
  const [guests, setGuests] = useState(2);

  const nights = nightsBetween(checkin, checkout);
  const pricePerNight = minPrice ?? 0;
  const roomTotal = pricePerNight * Math.max(nights, 1);
  const cleaningFee = Math.round(pricePerNight * 0.1);
  const serviceFee = Math.round(pricePerNight * 0.05);
  const total = roomTotal + cleaningFee + serviceFee;

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
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 2 }}>
        {minPrice != null ? (
          <>
            <Typography variant="h5" fontWeight={700}>
              ${minPrice.toLocaleString()}
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

      {/* Reserve button — navigates to booking if logged in, to login otherwise */}
      <Button
        variant="contained"
        fullWidth
        size="large"
        disableElevation
        disabled={authStatus === 'loading'}
        startIcon={
          authStatus === 'loading' ? (
            <CircularProgress aria-label={t('a11y.loading')} size={16} sx={{ color: 'white' }} />
          ) : authStatus === 'unauthenticated' ? (
            <LockOutlinedIcon sx={{ fontSize: 18 }} />
          ) : undefined
        }
        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, mb: 1.5 }}
        onClick={() =>
          requireAuth(
            `/traveler/booking?property_id=${property.id}&checkin=${checkin}&checkout=${checkout}&guests=${guests}`
          )
        }
      >
        {authStatus === 'unauthenticated' ? 'Sign in to Reserve' : 'Reserve'}
      </Button>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', mb: 2 }}
      >
        You won&apos;t be charged yet
      </Typography>

      {/* Price breakdown */}
      {minPrice != null && nights > 0 && (
        <>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                ${minPrice.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}
              </Typography>
              <Typography variant="body2">${roomTotal.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Cleaning fee
              </Typography>
              <Typography variant="body2">${cleaningFee.toLocaleString()}</Typography>
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
