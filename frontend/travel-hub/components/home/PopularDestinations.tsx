'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useTranslation } from 'react-i18next';

import { getFeaturedDestinations } from '@/app/lib/api/catalog';
import type { FeaturedDestination } from '@/app/lib/types/catalog';

interface PopularDestinationsProps {
  checkin: string;
  checkout: string;
  guests: number;
}

export default function PopularDestinations({ checkin, checkout, guests }: PopularDestinationsProps) {
  const { t } = useTranslation();
  const [destinations, setDestinations] = useState<FeaturedDestination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeaturedDestinations(4)
      .then(setDestinations)
      .catch(() => setDestinations([]))
      .finally(() => setLoading(false));
  }, []);

  function buildSearchUrl(dest: FeaturedDestination) {
    const params = new URLSearchParams({
      cityId: dest.id,
      cityName: dest.name,
      cityCountry: dest.country,
      checkin,
      checkout,
      guests: String(guests),
    });
    if (dest.department) params.set('cityDepartment', dest.department);
    return `/traveler/search?${params.toString()}`;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '1.5rem', color: 'grey.900' }}>
            {t('popular.title')}
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: 'grey.500', mt: 0.5 }}>
            {t('popular.subtitle')}
          </Typography>
        </Box>
        <Typography
          component={NextLink}
          href="/traveler/search"
          sx={{
            fontWeight: 500,
            fontSize: '0.875rem',
            color: '#0EA5E9',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {t('popular.seeAll')}
        </Typography>
      </Box>

      {/* Cards grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#0EA5E9' }} />
        </Box>
      ) : destinations.length === 0 ? (
        <Typography sx={{ color: 'grey.500', textAlign: 'center', py: 6 }}>
          {t('popular.empty')}
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: `repeat(${Math.min(destinations.length, 4)}, 1fr)` },
            gap: 3,
          }}
        >
          {destinations.map((dest) => (
            <Box
              key={dest.id}
              component={NextLink}
              href={buildSearchUrl(dest)}
              sx={{
                aspectRatio: '3 / 4',
                borderRadius: 6,
                overflow: 'hidden',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 40%, transparent 60%), url(${dest.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: 1,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'scale(1.02)' },
              }}
            >
              <Box sx={{ p: 2.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: 'white' }}>
                  {dest.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <LocationOnIcon sx={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)' }} />
                  <Typography sx={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)' }}>
                    {dest.country}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}