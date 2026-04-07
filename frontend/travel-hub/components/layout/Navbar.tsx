'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

import { getMe } from '@/app/lib/api/auth';

export default function Navbar() {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null));
  }, []);

  const dashboardHref =
    user?.role === 'HOTEL' || user?.role === 'AGENCY' || user?.role === 'ADMIN'
      ? '/manager'
      : '/traveler/search';

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'grey.200' }}>
      <Toolbar sx={{ maxWidth: 1280, width: '100%', mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Box
          component={NextLink}
          href="/"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none' }}
        >
          <Box component="img" src="/icon.svg" alt="TravelHub" sx={{ width: 26, height: 25 }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: 'grey.900', letterSpacing: '-0.025em' }}>
            TravelHub
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Typography
          component={NextLink}
          href="/traveler/search"
          sx={{
            fontWeight: 500,
            fontSize: '0.875rem',
            color: 'grey.500',
            textDecoration: 'none',
            '&:hover': { color: '#0EA5E9' },
          }}
        >
          Stays
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton sx={{ color: 'grey.500' }}>
            <NotificationsNoneIcon />
          </IconButton>

          {user ? (
            <Typography
              component={NextLink}
              href={dashboardHref}
              sx={{
                fontWeight: 500,
                fontSize: '0.875rem',
                color: 'grey.500',
                textDecoration: 'none',
                '&:hover': { color: '#0EA5E9' },
              }}
            >
              {user.email.split('@')[0]}
            </Typography>
          ) : (
            <Typography
              component={NextLink}
              href="/login/traveler"
              sx={{
                fontWeight: 500,
                fontSize: '0.875rem',
                color: 'grey.500',
                textDecoration: 'none',
                '&:hover': { color: '#0EA5E9' },
              }}
            >
              Log in
            </Typography>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
