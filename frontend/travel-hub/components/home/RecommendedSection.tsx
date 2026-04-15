'use client';

import { useEffect, useState } from 'react';

import NextLink from 'next/link';

import { getFeaturedProperties } from '@/app/lib/api/catalog';
import type { PropertySummary } from '@/app/lib/types/catalog';
import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

function PropertyCard({ property }: { property: PropertySummary }) {
  const { t } = useTranslation();
  return (
    <Box
      component={NextLink}
      href={`/traveler/hotel?id=${property.id}`}
      sx={{
        bgcolor: 'white',
        border: '1px solid',
        borderColor: 'grey.100',
        borderRadius: 6,
        overflow: 'hidden',
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 1,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'scale(1.02)' },
      }}
    >
      {/* Image */}
      {property.image ? (
        <Box
          component="img"
          src={property.image.url}
          alt={property.name}
          sx={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            aspectRatio: '3 / 2',
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            {t('recommended.noImage')}
          </Typography>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Name + Rating */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '1.125rem',
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {property.name}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {property.city.name}, {property.city.country}
            </Typography>
          </Box>

          {property.rating_avg != null && (
            <Box
              sx={{
                bgcolor: '#F0FDF4',
                borderRadius: 2,
                px: 0.75,
                py: 0.25,
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                flexShrink: 0,
                ml: 1,
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'success.dark' }}>
                {Number(property.rating_avg).toFixed(1)}
              </Typography>
              <StarIcon sx={{ fontSize: '0.625rem', color: 'success.dark' }} />
            </Box>
          )}
        </Box>

        {/* Amenities */}
        {property.amenities.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {property.amenities.slice(0, 3).map((amenity) => (
              <Chip
                key={amenity.code}
                label={amenity.name}
                size="small"
                sx={{
                  fontSize: '0.75rem',
                  height: 24,
                  bgcolor: '#F8FAFC',
                  color: 'text.secondary',
                  border: 'none',
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            ))}
          </Box>
        )}

        {/* Price */}
        {property.min_price != null && (
          <Box
            sx={{
              borderTop: '1px solid',
              borderColor: 'grey.100',
              pt: 2,
              mt: 'auto',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'baseline',
              gap: 0.5,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', color: 'primary.main' }}>
              ${property.min_price.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {t('recommended.perNight')}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function RecommendedSection() {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeaturedProperties(4)
      .then(setProperties)
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h2"
          sx={{ fontWeight: 700, fontSize: '1.5rem', color: 'text.primary' }}
        >
          {t('recommended.title')}
        </Typography>
        <Typography sx={{ fontSize: '1rem', color: 'text.secondary', mt: 0.5 }}>
          {t('recommended.subtitle')}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : properties.length === 0 ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
          {t('recommended.empty')}
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 3,
          }}
        >
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </Box>
      )}
    </Box>
  );
}
