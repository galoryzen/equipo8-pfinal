'use client';

import type { RoomTypeOut } from '@/app/lib/types/catalog';
import BedIcon from '@mui/icons-material/Bed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupIcon from '@mui/icons-material/Group';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

interface RoomTypeCardProps {
  room: RoomTypeOut;
  checkin?: string;
  checkout?: string;
}

function cancellationLabel(type: string): string {
  if (type === 'FULL') return 'Free Cancellation';
  if (type === 'PARTIAL') return 'Partial Refund';
  return 'Non-Refundable';
}

export default function RoomTypeCard({ room, checkin, checkout }: RoomTypeCardProps) {
  const activePlans = room.rate_plans.filter((rp) => rp.min_price != null);
  const cheapestPlan = activePlans.length
    ? activePlans.reduce((a, b) => (a.min_price! < b.min_price! ? a : b))
    : null;

  const displayPrice = room.min_price ?? cheapestPlan?.min_price ?? null;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 0,
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
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem' }}>
            {room.name}
          </Typography>
          {displayPrice != null && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" color="primary.main" fontWeight={700} component="span">
                ${Number(displayPrice).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="span">
                {' '}
                / night
              </Typography>
            </Box>
          )}
        </Box>

        {/* Capacity */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
          <GroupIcon sx={{ fontSize: 16 }} />
          <Typography variant="body2">
            {room.capacity} {room.capacity === 1 ? 'guest' : 'guests'}
          </Typography>
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

        {/* Rate plans */}
        {activePlans.slice(0, 2).map((plan) => (
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
                    {cancellationLabel(plan.cancellation_policy.type)}
                  </Typography>
                </Box>
              )}
            </Box>
            <Button
              variant="contained"
              size="small"
              disableElevation
              sx={{ borderRadius: 2, textTransform: 'none', px: 2 }}
              href={
                checkin && checkout
                  ? `/traveler/booking?room_type_id=${room.id}&rate_plan_id=${plan.id}&checkin=${checkin}&checkout=${checkout}`
                  : undefined
              }
            >
              Select Room
            </Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
