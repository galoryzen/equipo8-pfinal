'use client';

import { useEffect, useState } from 'react';

import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { getMe } from '@/app/lib/api/auth';
import { defaultLocale } from '@/lib/i18n/settings';
import { tokens as th } from '@/lib/theme/tokens';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const langLabel = i18n.language.startsWith('es') ? 'ES' : 'EN';

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  function handleLogout() {
    setMenuAnchor(null);
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
          <IconButton
            onClick={() =>
              void i18n.changeLanguage(i18n.language.startsWith('es') ? defaultLocale : 'es-CO')
            }
            sx={{ color: 'text.secondary', borderRadius: '8px', gap: 0.5, fontSize: '0.8rem' }}
          >
            <LanguageIcon sx={{ fontSize: 20 }} />
            <Typography
              component="span"
              sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}
            >
              {langLabel}
            </Typography>
          </IconButton>

          {user ? (
            <>
              <IconButton sx={{ color: 'text.secondary' }}>
                <NotificationsNoneIcon />
              </IconButton>

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
