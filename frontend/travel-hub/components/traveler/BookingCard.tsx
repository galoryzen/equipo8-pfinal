'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';

import {
  estimateGuestLabel,
  formatBookingRef,
  formatTripDate,
  getPrimaryRoomLabel,
  primaryPropertyId,
} from '@/app/lib/myTrips/formatting';
import { statusChipProps } from '@/app/lib/myTrips/statusLabels';
import { abandonCart } from '@/app/lib/api/booking';
import type { BookingListItem } from '@/app/lib/types/booking';
import type { PropertyDetail } from '@/app/lib/types/catalog';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface BookingCardProps {
  booking: BookingListItem;
  property: PropertyDetail | null | undefined;
  onCartAction?: () => void;
}

function primaryImageUrl(property: PropertyDetail | null | undefined): string | null {
  if (!property?.images?.length) return null;
  const sorted = [...property.images].sort((a, b) => a.display_order - b.display_order);
  return sorted[0]?.url ?? null;
}

export default function BookingCard({ booking, property, onCartAction }: BookingCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const pid = primaryPropertyId(booking);
  const hotelName = property?.name ?? t('myTrips.card.hotelName');
  const cityLine = property?.city
    ? `${property.city.name}${property.city.country ? `, ${property.city.country}` : ''}`
    : pid
      ? t('myTrips.card.locationNotAvailable')
      : '—';
  const imageUrl = primaryImageUrl(property);
  const rating = property?.rating_avg;
  const guests = estimateGuestLabel(booking, property ?? null);
  const roomLabel = getPrimaryRoomLabel(booking, property ?? null);
  const { label: statusLabel, color: statusColor } = statusChipProps(booking.status);

  const isCart = booking.status === 'CART';
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleResume = () => {
    const params = new URLSearchParams({
      booking_id: booking.id,
      property_id: booking.property_id,
      room_type_id: booking.room_type_id,
      checkin: booking.checkin,
      checkout: booking.checkout,
      guests: String(booking.guests_count ?? 1),
      currency: booking.currency_code,
      property_name: property?.name ?? '',
      room_name: roomLabel ?? '',
      ...(imageUrl && { image_url: imageUrl }),
    });
    router.push(`/traveler/payment?${params.toString()}`);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleteDialogOpen(false);
    setDeleting(true);
    try {
      await abandonCart(booking.id);
      onCartAction?.();
    } catch {
      alert(t('myTrips.deleteError', 'Could not delete booking hold.'));
    } finally {
      setDeleting(false);
    }
  };

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
          <CardMedia
            component="img"
            image={imageUrl}
            alt={hotelName}
            sx={{ height: '100%', minHeight: 200, objectFit: 'cover' }}
          />
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
            <Typography color="text.secondary">{t('myTrips.card.noImage')}</Typography>
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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1,
            mb: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
              {hotelName}
            </Typography>
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              <LocationOnOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography variant="body2" noWrap>
                {cityLine}
              </Typography>
            </Stack>
          </Box>
          <Chip
            label={statusLabel}
            color={statusColor}
            size="small"
            sx={{ fontWeight: 600, flexShrink: 0 }}
          />
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2, mb: 2 }}>
          <Box>
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              <CalendarTodayOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography variant="caption" fontWeight={600}>
                {t('myTrips.card.checkIn')}
              </Typography>
            </Stack>
            <Typography variant="subtitle1" fontWeight={700}>
              {formatTripDate(booking.checkin)}
            </Typography>
          </Box>
          <Box>
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              <EventOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography variant="caption" fontWeight={600}>
                {t('myTrips.card.checkOut')}
              </Typography>
            </Stack>
            <Typography variant="subtitle1" fontWeight={700}>
              {formatTripDate(booking.checkout)}
            </Typography>
          </Box>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {[guests, roomLabel, booking.guest_name, formatBookingRef(booking.id)]
            .filter(Boolean)
            .join(' · ')}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Divider sx={{ my: 0 }} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2, gap: 1 }}>
          {isCart ? (
            <>
              <Button
                variant="outlined"
                onClick={handleDeleteClick}
                disabled={deleting}
                sx={{ textTransform: 'none', px: 3 }}
              >
                {deleting ? t('myTrips.deleting', 'Deleting…') : t('myTrips.delete', 'Delete')}
              </Button>
              <Button
                variant="contained"
                onClick={handleResume}
                sx={{ textTransform: 'none', px: 3 }}
              >
                {t('myTrips.resume', 'Resume')}
              </Button>
            </>
          ) : (
            <Button
              component={NextLink}
              href={`/traveler/my-trips/detail/?bookingId=${encodeURIComponent(booking.id)}`}
              variant="contained"
              sx={{ textTransform: 'none', px: 3 }}
            >
              {t('myTrips.card.viewDetails')}
            </Button>
          )}
        </Box>
      </Box>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-cart-dialog-title"
      >
        <DialogTitle id="delete-cart-dialog-title">
          {t('myTrips.confirmDeleteTitle', 'Delete booking hold?')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('myTrips.confirmDeleteCart', 'This will release your booking hold. This action cannot be undone.')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>
            {t('myTrips.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            disabled={deleting}
            sx={{ textTransform: 'none' }}
          >
            {deleting ? t('myTrips.deleting', 'Deleting…') : t('myTrips.delete', 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
