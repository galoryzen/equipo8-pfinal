'use client';

import { Suspense, useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';

function BookingRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    router.replace(`/traveler/payment?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Container>
  );
}

export default function TravelerBookingsPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      }
    >
      <BookingRedirect />
    </Suspense>
  );
}
