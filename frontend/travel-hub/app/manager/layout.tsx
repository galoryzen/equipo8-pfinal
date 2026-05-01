'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { getMe, logoutUser } from '@/app/lib/api/auth';
import { tokens as th } from '@/lib/theme/tokens';
import BarChartIcon from '@mui/icons-material/BarChart';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { Box } from '@mui/material';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import AuthGuard from '../components/AuthGuard';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const MENU_ITEMS = [
    {
      key: 'manager.hotels.admin.navbar.dashboard',
      icon: <DashboardCustomizeOutlinedIcon />,
      activeIcon: <DashboardCustomizeIcon />,
      href: '/manager',
    },
    {
      key: 'manager.hotels.admin.navbar.bookings',
      icon: <CalendarTodayOutlinedIcon />,
      activeIcon: <CalendarTodayIcon />,
      href: '/manager/bookings',
    },
    {
      key: 'manager.hotels.admin.navbar.hotels',
      icon: <DashboardCustomizeOutlinedIcon />,
      activeIcon: <DashboardCustomizeIcon />,
      href: '/manager/hotels',
    },
    {
      key: 'manager.hotels.admin.navbar.notifications',
      icon: <NotificationsNoneOutlinedIcon />,
      activeIcon: <NotificationsIcon />,
      href: '/manager/notifications',
    },
    {
      key: 'manager.hotels.admin.navbar.reports',
      icon: <BarChartOutlinedIcon />,
      activeIcon: <BarChartIcon />,
      href: '/manager/reports',
    },
    {
      key: 'manager.hotels.admin.navbar.settings',
      icon: <SettingsOutlinedIcon />,
      activeIcon: <SettingsOutlinedIcon />,
      href: '/manager/settings',
    },
  ];

  function isActive(href: string) {
    const p = pathname.replace(/\/$/, '') || '/';
    const h = href.replace(/\/$/, '') || '/';
    if (h === '/manager') {
      return p === '/manager';
    }
    return p === h || p.startsWith(`${h}/`);
  }

  function formatDisplayName(email: string) {
    const localPart = email.split('@')[0] ?? email;
    return localPart.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatRole(role: string) {
    if (role === 'ADMIN') return 'Super Admin';
    if (role === 'HOTEL') return 'Hotel Partner';
    if (role === 'AGENCY') return 'Agency Partner';
    return role;
  }

  async function handleLogout() {
    await logoutUser();
    document.cookie = 'access_token=; Max-Age=0; path=/';
    router.push('/');
  }

  return (
    <AuthGuard>
      <div style={{ display: 'flex' }}>
        <Box
          component="aside"
          sx={{
            position: 'sticky',
            top: 0,
            alignSelf: 'flex-start',
            height: '100vh',
            maxHeight: '100vh',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '12px',
                  bgcolor: th.brand.accentOrangeSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <TravelExploreIcon sx={{ fontSize: 22, color: th.brand.accentOrange }} />
              </Box>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: '#111827',
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {t('manager.hotels.admin.navbar.title')}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: '#64748B',
                    fontWeight: 500,
                    lineHeight: 1.25,
                  }}
                >
                  {t('manager.hotels.admin.navbar.subtitle')}
                </Typography>
              </Box>
            </Box>
            <Divider />
            <List sx={{ flex: 1 }} disablePadding>
              {MENU_ITEMS.map((item, index) => (
                <ListItem key={index} disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    component={Link}
                    href={item.href}
                    selected={isActive(item.href)}
                    sx={{
                      borderRadius: '10px',
                      mx: 1,
                      my: 0.5,
                      color: th.text.secondary,
                      '& .MuiListItemIcon-root': {
                        minWidth: 36,
                        color: th.text.secondary,
                      },
                      '& .MuiTypography-root': {
                        fontWeight: 500,
                      },
                      '&.Mui-selected': {
                        backgroundColor: th.brand.accentOrangeSoft,
                        color: th.brand.accentOrangeFg,
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: th.brand.accentOrangeSoft,
                      },
                      '&.Mui-selected .MuiListItemIcon-root': {
                        color: th.brand.accentOrangeFg,
                      },
                      '&.Mui-selected .MuiTypography-root': {
                        fontWeight: 700,
                      },
                    }}
                  >
                    <ListItemIcon>{isActive(item.href) ? item.activeIcon : item.icon}</ListItemIcon>
                    <ListItemText primary={t(item.key)} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            <Box sx={{ px: 2, pb: 2, pt: 1, mt: 'auto' }}>
              <Button
                type="button"
                onClick={handleLogout}
                fullWidth
                variant="contained"
                startIcon={<LogoutIcon />}
                sx={{
                  bgcolor: th.brand.accentOrange,
                  color: 'white',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '10px',
                  py: 1,
                  '&:hover': {
                    bgcolor: th.brand.accentOrange,
                    filter: 'brightness(0.95)',
                  },
                }}
              >
                {t('nav.logOut')}
              </Button>
            </Box>
          </Box>
        </Box>
        <main style={{ flex: 1, background: '#F8FAFC', minHeight: '100vh' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              px: 3,
              py: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: th.brand.accentOrangeSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: th.brand.accentOrangeFg,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {user ? formatDisplayName(user.email).slice(0, 2) : 'UA'}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
                <Typography sx={{ fontWeight: 700, color: th.text.primary, fontSize: '0.95rem' }}>
                  {user ? formatDisplayName(user.email) : 'TravelHub Admin'}
                </Typography>
                <Typography sx={{ fontWeight: 600, color: th.text.secondary, fontSize: '0.68rem' }}>
                  {user ? formatRole(user.role) : 'Super Admin'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ px: 3, pb: 3 }}>{children}</Box>
        </main>
      </div>
    </AuthGuard>
  );
}
