'use client';

import NextLink from 'next/link';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import StarIcon from '@mui/icons-material/Star';

import { statusChipProps } from '@/app/lib/myTrips/statusLabels';
import {
  estimateGuestLabel,
  formatBookingRef,
  formatTripDate,
  getPrimaryRoomLabel,
  primaryPropertyId,
} from '@/app/lib/myTrips/formatting';
import type { BookingListItem } from '@/app/lib/types/booking';
import type { PropertyDetail } from '@/app/lib/types/catalog';

interface BookingCardProps {
  booking: BookingListItem;
  property: PropertyDetail | null | undefined;
}

function primaryImageUrl(property: PropertyDetail | null | undefined): string | null {
  if (!property?.images?.length) return null;
  const sorted = [...property.images].sort((a, b) => a.display_order - b.display_order);
  return sorted[0]?.url ?? null;
}

export default function BookingCard({ booking, property }: BookingCardProps) {
  const pid = primaryPropertyId(booking);
  const hotelName = property?.name ?? 'Hotel';
  const cityLine = property?.city
    ? `${property.city.name}${property.city.country ? `, ${property.city.country}` : ''}`
    : pid
      ? 'Ubicación no disponible'
      : '—';
  const imageUrl = primaryImageUrl(property);
  const rating = property?.rating_avg;
  const guests = estimateGuestLabel(booking, property ?? null);
  const roomLabel = getPrimaryRoomLabel(booking, property ?? null);
  const { label: statusLabel, color: statusColor } = statusChipProps(booking.status);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'stretch',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: { xs: '100%', md: 280 },
          minHeight: { xs: 200, md: 'auto' },
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          <CardMedia component="img" image={imageUrl} alt={hotelName} sx={{ height: '100%', minHeight: 200, objectFit: 'cover' }} />
        ) : (
          <Box
            sx={{
              height: '100%',
              minHeight: 200,
              bgcolor: 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">Sin imagen</Typography>
          </Box>
        )}
        {rating != null && (
          <Chip
            icon={<StarIcon sx={{ fontSize: 16, '&&': { color: 'warning.main' } }} />}
            label={Number(rating).toFixed(1)}
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              bgcolor: 'rgba(255,255,255,0.95)',
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      <Box sx={{ flex: 1, p: 2.5, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
              {hotelName}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary" sx={{ mt: 0.5 }}>
              <LocationOnOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography variant="body2" noWrap>
                {cityLine}
              </Typography>
            </Stack>
          </Box>
          <Chip label={statusLabel} color={statusColor} size="small" sx={{ fontWeight: 600, flexShrink: 0 }} />
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2, mb: 2 }}>
          <Box>
            <Stack direction="row" spacing={0.75} alignItems="center" color="text.secondary" sx={{ mb: 0.5 }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography variant="caption" fontWeight={600}>
                Check-in
              </Typography>
            </Stack>
            <Typography variant="subtitle1" fontWeight={700}>
              {formatTripDate(booking.checkin)}
            </Typography>
          </Box>
          <Box>
            <Stack direction="row" spacing={0.75} alignItems="center" color="text.secondary" sx={{ mb: 0.5 }}>
              <EventOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography variant="caption" fontWeight={600}>
                Check-out
              </Typography>
            </Stack>
            <Typography variant="subtitle1" fontWeight={700}>
              {formatTripDate(booking.checkout)}
            </Typography>
          </Box>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {[guests, roomLabel, formatBookingRef(booking.id)].filter(Boolean).join(' · ')}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Divider sx={{ my: 0 }} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
          <Button
            component={NextLink}
            href={`/traveler/my-trips/detail/?bookingId=${encodeURIComponent(booking.id)}`}
            variant="contained"
            sx={{ textTransform: 'none', px: 3 }}
          >
            View details
          </Button>
        </Box>
      </Box>
    </Card>
  );
}
