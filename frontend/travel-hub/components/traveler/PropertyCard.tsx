'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StarIcon from '@mui/icons-material/Star';
import Typography from '@mui/material/Typography';

import type { PropertySummary } from '@/app/lib/types/catalog';

interface PropertyCardProps {
  property: PropertySummary;
}

function formatReviewCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k reviews`;
  return `${count} reviews`;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      variant="outlined"
    >
      {/* Image */}
      {property.image ? (
        <CardMedia
          component="img"
          height={208}
          image={property.image.url}
          alt={property.image.caption ?? property.name}
          sx={{ objectFit: 'cover', height: 208 }}
        />
      ) : (
        <Box
          sx={{
            height: 208,
            bgcolor: 'grey.200',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography color="text.secondary">No image</Typography>
        </Box>
      )}

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        {/* Name + Rating */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              fontSize: '1.05rem',
            }}
          >
            {property.name}
          </Typography>
          {property.rating_avg != null && (
            <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
              <Chip
                icon={<StarIcon sx={{ fontSize: 14 }} />}
                label={Number(property.rating_avg).toFixed(1)}
                size="small"
                sx={{
                  bgcolor: 'primary.50',
                  color: 'primary.dark',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  '& .MuiChip-icon': { color: 'primary.main' },
                }}
              />
              <Typography variant="caption" sx={{ display: 'block', color: 'grey.500', mt: 0.25 }}>
                {formatReviewCount(property.review_count)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Location */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <LocationOnIcon sx={{ fontSize: 14, color: 'grey.400' }} />
          <Typography variant="body2" color="text.secondary">
            {property.city.name}, {property.city.country}
          </Typography>
        </Box>

        {/* Amenities */}
        {property.amenities.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
            {property.amenities.slice(0, 3).map((amenity) => (
              <Chip
                key={amenity.code}
                label={amenity.name}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem', height: 24 }}
              />
            ))}
          </Box>
        )}

        {/* Price */}
        {property.min_price != null && (
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 0.5, mt: 'auto', pt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              ${property.min_price.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              / night
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
