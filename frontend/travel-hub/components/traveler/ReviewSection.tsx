'use client';

import type { PaginatedResponse, ReviewOut } from '@/app/lib/types/catalog';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

interface ReviewSectionProps {
  reviews: PaginatedResponse<ReviewOut>;
  ratingAvg: number | null;
  onLoadMore?: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ReviewSection({ reviews, ratingAvg, onLoadMore }: ReviewSectionProps) {
  const { t } = useTranslation();

  return (
    <Box>
      {/* Header — aligned with PropertyDetailView: show aggregate or unavailable */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {ratingAvg != null ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StarIcon sx={{ color: '#f59e0b', fontSize: 28 }} aria-hidden />
              <Typography variant="h5" component="p" fontWeight={700}>
                {Number(ratingAvg).toFixed(1)}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" component="span">
              · {t('propertyDetail.reviews.reviewsCount_one', { count: reviews.total })}
            </Typography>
          </>
        ) : (
          <Typography variant="h6" fontWeight={600} color="text.secondary" component="p">
            {t('propertyDetail.reviews.noReviewsYet')}
          </Typography>
        )}
      </Box>

      {reviews.items.length === 0 && ratingAvg != null && (
        <Typography color="text.secondary">{t('propertyDetail.reviews.noReviewsYet')}</Typography>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {reviews.items.map((review) => (
          <Box key={review.id}>
            {/* Reviewer */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'grey.300',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PersonIcon sx={{ color: 'text.secondary' }} />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {t('propertyDetail.reviews.guestName')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(review.created_at)}
                </Typography>
              </Box>
            </Box>

            <Rating value={review.rating} readOnly size="small" precision={1} sx={{ mb: 0.75 }} />

            {review.comment && (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {review.comment}
              </Typography>
            )}
          </Box>
        ))}
      </Box>

      {reviews.items.length > 0 && onLoadMore && reviews.page < reviews.total_pages && (
        <>
          <Divider sx={{ my: 3 }} />
          <Button
            variant="outlined"
            onClick={onLoadMore}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {t('propertyDetail.reviews.showAllReviews', { count: reviews.total })}
          </Button>
        </>
      )}
    </Box>
  );
}
