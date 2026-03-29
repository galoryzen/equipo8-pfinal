'use client';

import { useEffect } from 'react';

import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useRouter } from 'next/navigation';

import { getMe } from '@/app/lib/api/auth';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    getMe().then((user) => {
      if (!user) {
        router.replace('/login/traveler');
        return;
      }

      if (user.role === 'HOTEL' || user.role === 'AGENCY' || user.role === 'ADMIN') {
        router.replace('/manager');
      } else {
        router.replace('/traveler/search');
      }
    });
  }, [router]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
