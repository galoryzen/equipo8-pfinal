'use client';

import { useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';

import { getMe } from '../lib/api/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

const MANAGER_ROLES = new Set(['HOTEL', 'AGENCY', 'ADMIN']);

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
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
        <CircularProgress aria-label={t('a11y.loading')} />
      </Box>
    );
  }

  return <>{children}</>;
}
