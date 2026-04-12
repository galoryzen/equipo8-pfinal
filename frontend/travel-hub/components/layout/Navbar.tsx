'use client';

import { useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import LanguageIcon from '@mui/icons-material/Language';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LogoutIcon from '@mui/icons-material/Logout';

import { getMe } from '@/app/lib/api/auth';

const navLinkActive = '#0EA5E9';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [lang, setLang] = useState<'EN' | 'ES'>('EN');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null));
  }, []);

  function handleLogout() {
    setMenuAnchor(null);
    document.cookie = 'access_token=; Max-Age=0; path=/';
    setUser(null);
    router.push('/');
  }

  const dashboardHref =
    user?.role === 'HOTEL' || user?.role === 'AGENCY' || user?.role === 'ADMIN'
      ? '/manager'
      : '/';

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'grey.200' }}>
      <Toolbar sx={{ maxWidth: 1280, width: '100%', mx: 'auto', px: { xs: 2, md: 4 } }}>
        {/* Left section: Logo + Nav links */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
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

          <Typography
            component={NextLink}
            href="/"
            sx={{
              fontWeight: pathname === '/' ? 600 : 500,
              fontSize: '0.875rem',
              color: pathname === '/' ? navLinkActive : 'grey.500',
              textDecoration: 'none',
              borderBottom: pathname === '/' ? `2px solid ${navLinkActive}` : '2px solid transparent',
              pb: 0.25,
              '&:hover': { color: navLinkActive },
            }}
          >
            Explore
          </Typography>

          {user && (
            <Typography
              component={NextLink}
              href="/traveler/my-trips"
              sx={{
                fontWeight: pathname.startsWith('/traveler/my-trips') ? 600 : 500,
                fontSize: '0.875rem',
                color: pathname.startsWith('/traveler/my-trips') ? navLinkActive : 'grey.500',
                textDecoration: 'none',
                borderBottom: pathname.startsWith('/traveler/my-trips') ? `2px solid ${navLinkActive}` : '2px solid transparent',
                pb: 0.25,
                '&:hover': { color: navLinkActive },
              }}
            >
              My Trips
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Right section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={() => setLang((prev) => (prev === 'EN' ? 'ES' : 'EN'))}
            sx={{ color: 'grey.500', borderRadius: '8px', gap: 0.5, fontSize: '0.8rem' }}
          >
            <LanguageIcon sx={{ fontSize: 20 }} />
            <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'grey.600' }}>
              {lang}
            </Typography>
          </IconButton>

          {user ? (
            <>
              <IconButton sx={{ color: 'grey.500' }}>
                <NotificationsNoneIcon />
              </IconButton>

              <Box
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: 'pointer',
                  '&:hover .profile-name': { color: '#0EA5E9' },
                }}
              >
                <AccountCircleOutlinedIcon sx={{ color: 'grey.500', fontSize: 24 }} />
                <Typography
                  className="profile-name"
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    color: 'grey.500',
                    transition: 'color 0.15s',
                  }}
                >
                  {user.email.split('@')[0]}
                </Typography>
              </Box>

              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { mt: 1, borderRadius: '12px', minWidth: 160 } } }}
              >
                <MenuItem onClick={handleLogout} sx={{ fontSize: '0.875rem', color: 'grey.700' }}>
                  <ListItemIcon>
                    <LogoutIcon sx={{ fontSize: 18, color: 'grey.500' }} />
                  </ListItemIcon>
                  Log out
                </MenuItem>
              </Menu>
            </>
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
