'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import StarIcon from '@mui/icons-material/Star';
import PersonIcon from '@mui/icons-material/Person';

import type { PaginatedResponse, ReviewOut } from '@/app/lib/types/catalog';

interface ReviewSectionProps {
  reviews: PaginatedResponse<ReviewOut>;
  ratingAvg: number | null;
  onLoadMore?: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ReviewSection({ reviews, ratingAvg, onLoadMore }: ReviewSectionProps) {
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StarIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
          <Typography variant="h5" fontWeight={700}>
            {ratingAvg != null ? Number(ratingAvg).toFixed(1) : '—'}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          · {reviews.total.toLocaleString()} reviews
        </Typography>
      </Box>

      {reviews.items.length === 0 && (
        <Typography color="text.secondary">No reviews yet.</Typography>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {reviews.items.map((review) => (
          <Box key={review.id}>
            {/* Reviewer */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  width: 40, height: 40, borderRadius: '50%', bgcolor: 'grey.300',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <PersonIcon sx={{ color: 'grey.600' }} />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Guest
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
            Show all {reviews.total.toLocaleString()} reviews
          </Button>
        </>
      )}
    </Box>
  );
}
