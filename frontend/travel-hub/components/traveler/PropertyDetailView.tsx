'use client';

import { useCallback, useEffect, useState } from 'react';

import { getPropertyDetail, isCatalogNotFoundError } from '@/app/lib/api/catalog';
import type { PaginatedResponse, PropertyDetail, ReviewOut } from '@/app/lib/types/catalog';
import CancelIcon from '@mui/icons-material/Cancel';
import FreeBreakfastIcon from '@mui/icons-material/FreeBreakfast';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PoolIcon from '@mui/icons-material/Pool';
import ShareIcon from '@mui/icons-material/Share';
import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

import NotFoundView from '@/components/NotFoundView';

import AmenityList from './AmenityList';
import ImageGallery from './ImageGallery';
import PriceCard from './PriceCard';
import ReviewSection from './ReviewSection';
import RoomTypeCard from './RoomTypeCard';

interface PropertyDetailViewProps {
  id: string;
}

function formatReviewCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k reviews`;
  return `${count} reviews`;
}

function computeMinPrice(detail: PropertyDetail): number | null {
  const prices = detail.room_types.flatMap((rt) =>
    rt.rate_plans.map((rp) => rp.min_price).filter((p): p is number => p != null)
  );
  return prices.length ? Math.min(...prices) : null;
}

export default function PropertyDetailView({ id }: PropertyDetailViewProps) {
  const [detail, setDetail] = useState<PropertyDetail | null>(null);
  const [reviews, setReviews] = useState<PaginatedResponse<ReviewOut> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [checkin, setCheckin] = useState<string | undefined>(undefined);
  const [checkout, setCheckout] = useState<string | undefined>(undefined);
  const [reviewPage, setReviewPage] = useState(1);

  const fetchDetail = useCallback(
    async (ci?: string, co?: string, rPage = 1) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPropertyDetail(id, {
          checkin: ci,
          checkout: co,
          review_page: rPage,
          review_page_size: 4,
        });
        setDetail(data.detail);
        setReviews((prev) =>
          rPage === 1
            ? data.reviews
            : prev
              ? { ...data.reviews, items: [...prev.items, ...data.reviews.items] }
              : data.reviews
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load property'));
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  function handleDatesChange(ci: string, co: string) {
    setCheckin(ci);
    setCheckout(co);
    setReviewPage(1);
    fetchDetail(ci, co, 1);
  }

  function handleLoadMoreReviews() {
    const next = reviewPage + 1;
    setReviewPage(next);
    fetchDetail(checkin, checkout, next);
  }

  if (loading && !detail) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    if (isCatalogNotFoundError(error)) {
      return <NotFoundView variant="property" />;
    }
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error.message}
        </Typography>
        <Button variant="outlined" onClick={() => fetchDetail(checkin, checkout)}>
          Try again
        </Button>
      </Container>
    );
  }

  if (!detail) return null;

  const minPrice = computeMinPrice(detail);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumb */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="inherit" />} sx={{ mb: 2 }}>
        <Link href="/traveler/search" underline="hover" color="text.secondary" variant="body2">
          {detail.city.country}
        </Link>
        <Link href="/traveler/search" underline="hover" color="text.secondary" variant="body2">
          {detail.city.name}
        </Link>
        <Typography variant="body2" color="text.primary" fontWeight={500}>
          {detail.name}
        </Typography>
      </Breadcrumbs>

      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            fontWeight={700}
            gutterBottom
            sx={{ lineHeight: 1.2 }}
          >
            {detail.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {detail.rating_avg != null ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} aria-hidden />
                <Typography variant="body2" component="span" fontWeight={700}>
                  {Number(detail.rating_avg).toFixed(1)}
                </Typography>
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ textDecoration: 'underline', textUnderlineOffset: 2 }}
                >
                  ({formatReviewCount(detail.review_count)})
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" component="span">
                Rating not available
              </Typography>
            )}
            <Typography
              variant="body2"
              color="text.secondary"
              component="span"
              sx={{ userSelect: 'none' }}
            >
              |
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOnIcon sx={{ fontSize: 15, color: 'primary.main' }} aria-hidden />
              <Typography variant="body2" color="text.secondary">
                {detail.address ?? `${detail.city.name}, ${detail.city.country}`}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ShareIcon />}
          sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          Share
        </Button>
      </Box>

      {/* Image gallery */}
      <Box sx={{ mb: 3 }}>
        <ImageGallery images={detail.images} propertyName={detail.name} />
      </Box>

      {/* Policy chips */}
      {(detail.default_cancellation_policy || detail.amenities.length > 0) && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          {detail.default_cancellation_policy?.type === 'FULL' && (
            <Chip
              icon={<CancelIcon />}
              label="Free cancellation"
              size="small"
              sx={{ bgcolor: '#f0fdf4', color: '#166534', '& .MuiChip-icon': { color: '#16a34a' } }}
            />
          )}
          {detail.amenities.some((a) => a.code.toLowerCase().includes('pool')) && (
            <Chip
              icon={<PoolIcon />}
              label="Pool included"
              size="small"
              sx={{ bgcolor: '#eff6ff', color: '#1e40af' }}
            />
          )}
          {detail.amenities.some((a) => a.code.toLowerCase().includes('breakfast')) && (
            <Chip
              icon={<FreeBreakfastIcon />}
              label="Breakfast included"
              size="small"
              sx={{ bgcolor: '#fefce8', color: '#854d0e' }}
            />
          )}
        </Box>
      )}

      {/* Two-column layout */}
      <Grid container spacing={4}>
        {/* Left column */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* About */}
          {detail.description && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                About this property
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {detail.description}
              </Typography>
            </Box>
          )}

          <Divider sx={{ mb: 4 }} />

          {/* Amenities */}
          {detail.amenities.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Popular amenities
              </Typography>
              <AmenityList amenities={detail.amenities} previewCount={6} />
            </Box>
          )}

          {detail.amenities.length > 0 && <Divider sx={{ mb: 4 }} />}

          {/* Available rooms */}
          {detail.room_types.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Available Rooms
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {detail.room_types.map((room) => (
                  <RoomTypeCard key={room.id} room={room} checkin={checkin} checkout={checkout} />
                ))}
              </Box>
            </Box>
          )}

          {detail.room_types.length > 0 && <Divider sx={{ mb: 4 }} />}

          {/* Location placeholder */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Location
            </Typography>
            <Box
              sx={{
                height: 200,
                bgcolor: 'grey.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                <LocationOnIcon sx={{ fontSize: 36, color: 'error.main' }} />
                <Typography variant="body2" fontWeight={500}>
                  {detail.address ?? `${detail.city.name}, ${detail.city.country}`}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Reviews */}
          {reviews && (
            <Box sx={{ mb: 4 }}>
              <ReviewSection
                reviews={reviews}
                ratingAvg={detail.rating_avg}
                onLoadMore={handleLoadMoreReviews}
              />
            </Box>
          )}
        </Grid>

        {/* Right column — sticky price card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <PriceCard property={detail} minPrice={minPrice} onDatesChange={handleDatesChange} />
        </Grid>
      </Grid>
    </Container>
  );
}
