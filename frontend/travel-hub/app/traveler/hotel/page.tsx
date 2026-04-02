'use client';

import { Suspense } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useSearchParams } from 'next/navigation';

import PropertyDetailView from '@/components/traveler/PropertyDetailView';

function HotelDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>No property selected.</Box>
      </Box>
    );
  }

  return <PropertyDetailView id={id} />;
}

export default function TravelerHotelPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      }
    >
      <HotelDetailContent />
    </Suspense>
  );
}
