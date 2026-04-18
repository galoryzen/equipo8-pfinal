'use client';

import NextLink from 'next/link';

import type { RoomTypeOut } from '@/app/lib/types/catalog';
import { tokens as th } from '@/lib/theme/tokens';
import BedIcon from '@mui/icons-material/Bed';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupIcon from '@mui/icons-material/Group';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import type { SelectedRoomInfo } from '@/components/traveler/PropertyDetailView';

interface RoomTypeCardProps {
  room: RoomTypeOut;
  checkin?: string;
  checkout?: string;
  selectedRatePlanId: string | null;
  onRoomSelect: (info: SelectedRoomInfo) => void;
  /** The current user's own active CART booking_id for this room, if any */
  activeCartBookingId: string | null;
}

function cancellationLabel(type: string, t: (key: string) => string): string {
  if (type === 'FULL') return t('roomCard.cancellation.free');
  if (type === 'PARTIAL') return t('roomCard.cancellation.partial');
  return t('roomCard.cancellation.nonRefundable');
}

function borderColor(hasOwnCart: boolean, isSelected: boolean): string {
  if (hasOwnCart) return th.state.warningBorder;
  if (isSelected) return 'primary.main';
  return 'divider';
}

export default function RoomTypeCard({
  room,
  checkin,
  checkout,
  selectedRatePlanId,
  onRoomSelect,
  activeCartBookingId,
}: RoomTypeCardProps) {
  const { t } = useTranslation();
  const activePlans = room.rate_plans.filter((rp) => rp.min_price != null);
  const cheapestPlan = activePlans.length
    ? activePlans.reduce((a, b) => (a.min_price! < b.min_price! ? a : b))
    : null;

  const displayPrice = room.min_price ?? cheapestPlan?.min_price ?? null;
  const hasDates = Boolean(checkin && checkout);
  const hasOwnCart = Boolean(activeCartBookingId);

  const resumeParams = activeCartBookingId
    ? new URLSearchParams({
        booking_id: activeCartBookingId,
        room_type_id: room.id,
        room_name: room.name,
        ...(checkin ? { checkin } : {}),
        ...(checkout ? { checkout } : {}),
      }).toString()
    : '';

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: borderColor(hasOwnCart, Boolean(selectedRatePlanId)),
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 0,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Room image placeholder */}
      <Box
        sx={{
          width: { xs: '100%', sm: 200 },
          minHeight: 160,
          bgcolor: 'grey.200',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem' }}>
              {room.name}
            </Typography>
            {hasOwnCart && (
              <Chip
                label={t('roomCard.bookingInProgress')}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: th.state.warningBg,
                  color: th.state.warningFg,
                  border: '1px solid',
                  borderColor: th.state.warningBorder,
                }}
              />
            )}
          </Box>
          {displayPrice != null && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" color="primary.main" fontWeight={700} component="span">
                ${Number(displayPrice).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="span">
                {' '}
                {t('roomCard.perNight')}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Capacity */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
          <GroupIcon sx={{ fontSize: 16 }} />
          <Typography variant="body2">{t('roomCard.guest', { count: room.capacity })}</Typography>
        </Box>

        {/* Amenities */}
        {room.amenities.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {room.amenities.slice(0, 4).map((a) => (
              <Chip
                key={a.code}
                label={a.name}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 22 }}
              />
            ))}
          </Box>
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* ── State: current user's own active hold ── */}
        {hasOwnCart && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('roomCard.ownHoldText')}
            </Typography>
            <Button
              component={NextLink}
              href={`/traveler/payment?${resumeParams}`}
              variant="outlined"
              size="small"
              disableElevation
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 2,
                fontWeight: 700,
                borderColor: th.state.warningBorder,
                color: th.state.warningFg,
                bgcolor: 'transparent',
                '&:hover': { bgcolor: th.state.warningBg, borderColor: th.state.warningBorder },
              }}
            >
              {t('roomCard.resumeBooking')}
            </Button>
          </Box>
        )}

        {/* ── State: normal — rate plan rows ── */}
        {!hasOwnCart &&
          activePlans.slice(0, 2).map((plan) => {
            const isSelected = selectedRatePlanId === plan.id;
            return (
              <Box
                key={plan.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {plan.name}
                  </Typography>
                  {plan.cancellation_policy && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main' }} />
                      <Typography variant="caption" color="success.main">
                        {cancellationLabel(plan.cancellation_policy.type, t)}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Tooltip
                  title={!hasDates ? t('roomCard.selectDatesTooltip') : ''}
                  disableHoverListener={hasDates}
                >
                  <span>
                    <Button
                      variant={isSelected ? 'contained' : 'outlined'}
                      size="small"
                      disableElevation
                      disabled={!hasDates}
                      startIcon={isSelected ? <CheckIcon sx={{ fontSize: 14 }} /> : undefined}
                      sx={{ borderRadius: 2, textTransform: 'none', px: 2 }}
                      onClick={() =>
                        onRoomSelect({
                          roomTypeId: room.id,
                          ratePlanId: plan.id,
                          unitPrice: plan.min_price ?? room.min_price ?? 0,
                          roomName: room.name,
                        })
                      }
                    >
                      {isSelected ? t('roomCard.selected') : t('roomCard.selectRoom')}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            );
          })}
      </Box>
    </Box>
  );
}
