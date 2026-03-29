'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

import { getMe } from '../lib/api/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

const MANAGER_ROLES = new Set(['HOTEL', 'AGENCY', 'ADMIN']);

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getMe().then((user) => {
      if (!user) {
        const isTravelerRoute = pathname.startsWith('/traveler');
        router.replace(isTravelerRoute ? '/login/traveler' : '/login/manager');
        return;
      }

      const isManagerRole = MANAGER_ROLES.has(user.role);
      const isTravelerRoute = pathname.startsWith('/traveler');
      const isManagerRoute = pathname.startsWith('/manager');

      if (isTravelerRoute && isManagerRole) {
        router.replace('/manager');
        return;
      }

      if (isManagerRoute && !isManagerRole) {
        router.replace('/traveler/search');
        return;
      }

      setChecked(true);
    });
  }, [pathname, router]);

  if (!checked) {
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

  return <>{children}</>;
}
