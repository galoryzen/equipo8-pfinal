'use client';

import { Suspense } from 'react';

import { useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';

import NotFoundView from '@/components/NotFoundView';
import PropertyDetailView from '@/components/traveler/PropertyDetailView';

function HotelDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return <NotFoundView variant="missingParam" />;
  }

  return <PropertyDetailView id={id} />;
}

export default function TravelerHotelPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
          }}
        >
          <CircularProgress aria-label={t('a11y.loading')} />
        </Box>
      }
    >
      <HotelDetailContent />
    </Suspense>
  );
}
