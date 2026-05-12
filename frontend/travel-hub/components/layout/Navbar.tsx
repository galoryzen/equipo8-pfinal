'use client';

import { useEffect, useState } from 'react';

import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { getMe, logoutUser } from '@/app/lib/api/auth';
import { tokens as th } from '@/lib/theme/tokens';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import LanguageDropdown from '@/components/i18n/LanguageDropdown';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    setMenuAnchor(null);
    await logoutUser();
    document.cookie = 'access_token=; Max-Age=0; path=/';
    setUser(null);
    router.push('/');
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'grey.200' }}
    >
      <Toolbar sx={{ maxWidth: 1280, width: '100%', mx: 'auto', px: { xs: 2, md: 4 } }}>
        {/* Left section: Logo + Nav links */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            component={NextLink}
            href="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none' }}
          >
            <Box
              component="img"
              src="/icon.svg"
              alt=""
              aria-hidden
              sx={{ width: 26, height: 25 }}
            />
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '1.25rem',
                color: 'text.primary',
                letterSpacing: '-0.025em',
              }}
            >
              {t('brand.name')}
            </Typography>
          </Box>

          <Typography
            component={NextLink}
            href="/"
            sx={{
              fontWeight: pathname === '/' ? 600 : 500,
              fontSize: '0.875rem',
              color: pathname === '/' ? 'primary.dark' : 'text.secondary',
              textDecoration: 'none',
              borderBottom:
                pathname === '/' ? `2px solid ${th.brand.primary}` : '2px solid transparent',
              pb: 0.25,
              '&:hover': { color: 'primary.dark' },
            }}
          >
            {t('nav.explore')}
          </Typography>

          {user && (
            <Typography
              component={NextLink}
              href="/traveler/my-trips"
              sx={{
                fontWeight: pathname.startsWith('/traveler/my-trips') ? 600 : 500,
                fontSize: '0.875rem',
                color: pathname.startsWith('/traveler/my-trips')
                  ? 'primary.dark'
                  : 'text.secondary',
                textDecoration: 'none',
                borderBottom: pathname.startsWith('/traveler/my-trips')
                  ? `2px solid ${th.brand.primary}`
                  : '2px solid transparent',
                pb: 0.25,
                '&:hover': { color: 'primary.dark' },
              }}
            >
              {t('nav.myTrips')}
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Right section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LanguageDropdown />

          {user ? (
            <>
              <Box
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: 'pointer',
                  '&:hover .profile-name': { color: 'primary.dark' },
                }}
              >
                <AccountCircleOutlinedIcon sx={{ color: 'text.secondary', fontSize: 24 }} />
                <Typography
                  className="profile-name"
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
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
                <MenuItem
                  onClick={handleLogout}
                  sx={{ fontSize: '0.875rem', color: 'text.primary' }}
                >
                  <ListItemIcon>
                    <LogoutIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </ListItemIcon>
                  {t('nav.logOut')}
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
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.dark' },
              }}
            >
              {t('nav.logIn')}
            </Typography>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
