'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type HotelBookingsMetrics,
  fetchHotelBookingsMetrics,
  listPartnerBookings,
} from '@/app/lib/api/booking';
import type { BookingListItem } from '@/app/lib/types/booking';
import { tokens } from '@/lib/theme/tokens';
import AddIcon from '@mui/icons-material/Add';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import RegisterCheckInDialog from '@/components/manager/bookings/RegisterCheckInDialog';
import RegisterCheckOutDialog from '@/components/manager/bookings/RegisterCheckOutDialog';

type TabKey = 'all' | 'checkin_today' | 'checkout_today' | 'pending' | 'cancelled';

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCurrency(amount: string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function formatShortDate(value: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/** Fallback if an older API omits `display_reference`. */
function formatBookingDisplayReferenceFallback(id: string): string {
  const compact = id.replace(/-/g, '').toUpperCase();
  return `#${compact.slice(-8)}`;
}

function guestInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase() || '?';
}

function getStatusChipSx(status: string): Record<string, string | number> {
  if (status === 'CHECKED_IN') {
    return {
      backgroundColor: tokens.state.successBg,
      color: tokens.state.successFg,
      border: `1px solid ${tokens.state.successBorder}`,
      fontWeight: 700,
    };
  }
  if (status === 'CHECKED_OUT') {
    return {
      backgroundColor: '#E0E7FF',
      color: '#3730A3',
      border: '1px solid #C7D2FE',
      fontWeight: 700,
    };
  }
  if (status === 'CONFIRMED') {
    return {
      backgroundColor: tokens.dashboard.statusChip.confirmed.bg,
      color: tokens.dashboard.statusChip.confirmed.fg,
      border: `1px solid ${tokens.dashboard.statusChip.confirmed.border}`,
      fontWeight: 700,
    };
  }
  if (status === 'PENDING_PAYMENT') {
    return {
      backgroundColor: tokens.dashboard.statusChip.pendingPayment.bg,
      color: tokens.dashboard.statusChip.pendingPayment.fg,
      border: `1px solid ${tokens.dashboard.statusChip.pendingPayment.border}`,
      fontWeight: 700,
    };
  }
  if (status === 'PENDING_CONFIRMATION') {
    return {
      backgroundColor: tokens.dashboard.statusChip.pendingConfirmation.bg,
      color: tokens.dashboard.statusChip.pendingConfirmation.fg,
      border: `1px solid ${tokens.dashboard.statusChip.pendingConfirmation.border}`,
      fontWeight: 700,
    };
  }
  if (status === 'CANCELLED' || status === 'REJECTED' || status === 'EXPIRED') {
    return {
      backgroundColor: '#FEE2E2',
      color: '#991B1B',
      border: '1px solid #FECACA',
      fontWeight: 700,
    };
  }
  return {
    backgroundColor: tokens.dashboard.statusChip.fallback.bg,
    color: tokens.dashboard.statusChip.fallback.fg,
    border: `1px solid ${tokens.dashboard.statusChip.fallback.border}`,
    fontWeight: 700,
  };
}

function bookingHasActionMenu(b: BookingListItem): boolean {
  return !['CANCELLED', 'EXPIRED', 'REJECTED', 'CHECKED_OUT'].includes(b.status);
}

const EMPTY_METRICS: HotelBookingsMetrics = {
  confirmedCount: 0,
  pendingCount: 0,
  checkInsTodayCount: 0,
  cancelledCount: 0,
};

function BookingsStatCard({
  icon,
  label,
  value,
  iconBg,
  testId,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  iconBg: string;
  testId: string;
}) {
  return (
    <Box
      sx={{
        bgcolor: tokens.surface.paper,
        borderRadius: 3,
        border: '1px solid',
        borderColor: tokens.border.subtle,
        p: 2.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: '100%',
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          bgcolor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{ fontSize: '0.8125rem', fontWeight: 600, color: tokens.text.secondary, mb: 0.25 }}
        >
          {label}
        </Typography>
        <Typography
          data-testid={testId}
          sx={{ fontSize: '1.35rem', fontWeight: 900, color: tokens.text.primary, lineHeight: 1.1 }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ManagerBookingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BookingListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);

  const [metrics, setMetrics] = useState<HotelBookingsMetrics>(EMPTY_METRICS);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuBooking, setMenuBooking] = useState<BookingListItem | null>(null);

  const [checkInTarget, setCheckInTarget] = useState<BookingListItem | null>(null);
  const [checkOutTarget, setCheckOutTarget] = useState<BookingListItem | null>(null);
  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const isClientTab = tab === 'checkin_today' || tab === 'checkout_today';

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const m = await fetchHotelBookingsMetrics();
      setMetrics(m);
    } catch (e) {
      setMetrics(EMPTY_METRICS);
      setMetricsError(e instanceof Error ? e.message : t('manager.bookings.stats.loadError'));
    } finally {
      setMetricsLoading(false);
    }
  }, [t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isClientTab) {
        const res = await listPartnerBookings({ page: 1, page_size: 100 });
        const today = formatLocalYmd(new Date());
        const filtered = res.items.filter((b) =>
          tab === 'checkin_today' ? b.checkin === today : b.checkout === today
        );
        setRows(filtered);
        setTotal(filtered.length);
        setTotalPages(1);
      } else {
        const status =
          tab === 'pending'
            ? 'PENDING_CONFIRMATION'
            : tab === 'cancelled'
              ? 'CANCELLED'
              : undefined;
        const res = await listPartnerBookings({ status, page, page_size: 10 });
        setRows(res.items);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.total_pages));
      }
    } catch (e) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setError(e instanceof Error ? e.message : t('manager.bookings.loadError'));
    } finally {
      setLoading(false);
    }
  }, [tab, page, isClientTab, t]);

  useEffect(() => {
    void load();
  }, [load, loadKey]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics, loadKey]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const statusLabel = useCallback(
    (status: string) => {
      if (status === 'CHECKED_OUT') {
        return t('manager.bookings.status.checkedOutDone');
      }
      if (status === 'CHECKED_IN') {
        return t('manager.hotels.roomTypeManage.dashboard.status.checked_in');
      }
      const normalized = status.toLowerCase();
      return t(`manager.hotels.roomTypeManage.dashboard.status.${normalized}`, {
        defaultValue: status.replace(/_/g, ' '),
      });
    },
    [t]
  );

  const pageSize = 10;
  const fromIdx = total === 0 ? 0 : isClientTab ? 1 : (page - 1) * pageSize + 1;
  const toIdx = total === 0 ? 0 : isClientTab ? total : Math.min(page * pageSize, total);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, booking: BookingListItem) => {
    setMenuAnchor(event.currentTarget);
    setMenuBooking(booking);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuBooking(null);
  };

  const bumpLoad = () => setLoadKey((k) => k + 1);

  const tabIndex = useMemo(() => {
    const order: TabKey[] = ['all', 'checkin_today', 'checkout_today', 'pending', 'cancelled'];
    return order.indexOf(tab);
  }, [tab]);

  return (
    <Box sx={{ pb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: '2rem',
              fontWeight: 800,
              color: tokens.dashboard.heading,
              letterSpacing: '-0.02em',
            }}
          >
            {t('manager.bookings.title')}
          </Typography>
          <Typography
            sx={{ color: tokens.text.secondary, mt: 0.5, fontWeight: 600, fontSize: '0.9rem' }}
          >
            {t('manager.bookings.subtitle')}
          </Typography>
        </Box>
        <Button
          component={Link}
          href="/traveler/search"
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            bgcolor: tokens.brand.accentOrange,
            px: 2.5,
            '&:hover': { bgcolor: tokens.brand.accentOrange, filter: 'brightness(0.95)' },
          }}
        >
          {t('manager.bookings.newBooking')}
        </Button>
      </Stack>

      <Card
        sx={{ borderRadius: 3, boxShadow: 'none', border: `1px solid ${tokens.border.subtle}` }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Tabs
            value={tabIndex}
            onChange={(_, next) => {
              const order: TabKey[] = [
                'all',
                'checkin_today',
                'checkout_today',
                'pending',
                'cancelled',
              ];
              setTab(order[next] ?? 'all');
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mb: 2,
              minHeight: 40,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.85rem' },
            }}
          >
            <Tab label={t('manager.bookings.tabs.all')} />
            <Tab label={t('manager.bookings.tabs.checkinToday')} />
            <Tab label={t('manager.bookings.tabs.checkoutToday')} />
            <Tab label={t('manager.bookings.tabs.pending')} />
            <Tab label={t('manager.bookings.tabs.cancelled')} />
          </Tabs>

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }} role="alert">
              {error}
            </Alert>
          ) : null}

          <Table size="small" aria-busy={loading}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>
                  {t('manager.bookings.table.bookingGuest')}
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {t('manager.bookings.table.roomType')}
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {t('manager.bookings.table.checkin')}
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {t('manager.bookings.table.checkout')}
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{t('manager.bookings.table.status')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  {t('manager.bookings.table.amount')}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  {t('manager.bookings.table.actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell colSpan={7}>
                        <Skeleton variant="text" height={28} />
                      </TableCell>
                    </TableRow>
                  ))
                : null}
              {!loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography
                      sx={{ py: 3, color: tokens.dashboard.mutedText, textAlign: 'center' }}
                    >
                      {t('manager.bookings.empty')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {!loading &&
                rows.map((b) => {
                  const guest = b.guest_name?.trim() || t('manager.bookings.table.guestFallback');
                  const avatarSrc = b.guest_image_url?.trim() || undefined;
                  const roomTitle =
                    b.property_name?.trim() || t('manager.bookings.table.roomFallback');
                  const roomSub =
                    b.room_type_name?.trim() || t('manager.bookings.table.roomTypeUnavailable');
                  const bookingRef =
                    typeof b.display_reference === 'string' && b.display_reference.trim()
                      ? b.display_reference.trim()
                      : formatBookingDisplayReferenceFallback(b.id);
                  return (
                    <TableRow key={b.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            src={avatarSrc}
                            alt=""
                            sx={{
                              width: 40,
                              height: 40,
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              bgcolor: tokens.brand.accentOrangeSoft,
                              color: tokens.brand.accentOrangeFg,
                            }}
                          >
                            {!avatarSrc ? guestInitials(guest) : null}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontWeight: 800,
                                color: tokens.text.primary,
                                fontSize: '0.95rem',
                                lineHeight: 1.2,
                              }}
                            >
                              {guest}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: tokens.brand.accentOrange,
                                mt: 0.25,
                              }}
                            >
                              {bookingRef}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{ fontWeight: 700, color: tokens.text.primary, fontSize: '0.9rem' }}
                        >
                          {roomTitle}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.78rem',
                            color: tokens.text.secondary,
                            fontWeight: 600,
                            mt: 0.25,
                          }}
                        >
                          {roomSub}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatShortDate(b.checkin)}</TableCell>
                      <TableCell>{formatShortDate(b.checkout)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabel(b.status)}
                          sx={getStatusChipSx(b.status)}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(b.total_amount, b.currency_code)}
                      </TableCell>
                      <TableCell align="right">
                        {bookingHasActionMenu(b) ? (
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
                            onClick={(e) => handleMenuOpen(e, b)}
                            aria-haspopup="true"
                            aria-expanded={Boolean(menuAnchor) && menuBooking?.id === b.id}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 700,
                              borderRadius: 2,
                              borderColor: tokens.border.subtle,
                              color: tokens.text.primary,
                              minWidth: 108,
                            }}
                          >
                            {t('manager.bookings.actions.menuLabel')}
                          </Button>
                        ) : (
                          <Typography
                            component="span"
                            sx={{ color: tokens.text.muted, fontWeight: 600, pr: 0.5 }}
                          >
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems="center"
            justifyContent="space-between"
            spacing={1.5}
            sx={{ mt: 2 }}
          >
            <Typography
              sx={{ fontSize: '0.875rem', color: tokens.text.secondary, fontWeight: 600 }}
            >
              {t('manager.bookings.pagination', { from: fromIdx, to: toIdx, total })}
            </Typography>
            {!isClientTab && totalPages > 1 ? (
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {metricsError ? (
        <Alert severity="warning" sx={{ mt: 2 }} role="alert">
          {metricsError}
        </Alert>
      ) : null}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {metricsLoading ? (
            <Skeleton variant="rounded" height={96} sx={{ borderRadius: 3 }} />
          ) : (
            <BookingsStatCard
              icon={
                <CheckCircleOutlineIcon sx={{ color: tokens.brand.accentOrange, fontSize: 22 }} />
              }
              label={t('manager.bookings.stats.confirmed')}
              value={metrics.confirmedCount}
              iconBg={tokens.brand.accentOrangeSoft}
              testId="bookings-stat-confirmed"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {metricsLoading ? (
            <Skeleton variant="rounded" height={96} sx={{ borderRadius: 3 }} />
          ) : (
            <BookingsStatCard
              icon={<HourglassEmptyOutlinedIcon sx={{ color: '#CA8A04', fontSize: 22 }} />}
              label={t('manager.bookings.stats.pending')}
              value={metrics.pendingCount}
              iconBg="#FEF9C3"
              testId="bookings-stat-pending"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {metricsLoading ? (
            <Skeleton variant="rounded" height={96} sx={{ borderRadius: 3 }} />
          ) : (
            <BookingsStatCard
              icon={<LoginIcon sx={{ color: '#2563EB', fontSize: 22 }} />}
              label={t('manager.bookings.stats.checkinsToday')}
              value={metrics.checkInsTodayCount}
              iconBg="#DBEAFE"
              testId="bookings-stat-checkins-today"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {metricsLoading ? (
            <Skeleton variant="rounded" height={96} sx={{ borderRadius: 3 }} />
          ) : (
            <BookingsStatCard
              icon={<CancelOutlinedIcon sx={{ color: tokens.state.errorFg, fontSize: 22 }} />}
              label={t('manager.bookings.stats.cancelled')}
              value={metrics.cancelledCount}
              iconBg="#FEE2E2"
              testId="bookings-stat-cancelled"
            />
          )}
        </Grid>
      </Grid>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        slotProps={{ paper: { sx: { minWidth: 220, borderRadius: 2, mt: 0.5 } } }}
      >
        {menuBooking?.can_register_check_in ? (
          <MenuItem
            onClick={() => {
              setCheckInTarget(menuBooking);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <LoginIcon fontSize="small" sx={{ color: tokens.state.success }} />
            </ListItemIcon>
            {t('manager.bookings.actions.registerCheckIn')}
          </MenuItem>
        ) : null}
        {menuBooking?.can_register_check_out ? (
          <MenuItem
            onClick={() => {
              setCheckOutTarget(menuBooking);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" sx={{ color: tokens.brand.primaryOnLight }} />
            </ListItemIcon>
            {t('manager.bookings.actions.registerCheckOut')}
          </MenuItem>
        ) : menuBooking?.status === 'CHECKED_IN' ? (
          <Tooltip title={t('manager.bookings.actions.checkOutUnavailableHint')}>
            <span>
              <MenuItem
                disabled
                aria-label={`${t('manager.bookings.actions.registerCheckOut')}. ${t('manager.bookings.actions.checkOutUnavailableHint')}`}
              >
                <ListItemIcon>
                  <LogoutIcon fontSize="small" sx={{ color: tokens.text.muted }} />
                </ListItemIcon>
                {t('manager.bookings.actions.registerCheckOut')}
              </MenuItem>
            </span>
          </Tooltip>
        ) : null}
        <Tooltip title={t('manager.bookings.actions.disabledNotImplemented')}>
          <span>
            <MenuItem
              disabled
              aria-label={`${t('manager.bookings.actions.editDetails')}. ${t('manager.bookings.actions.disabledNotImplemented')}`}
            >
              <ListItemIcon>
                <EditOutlinedIcon fontSize="small" sx={{ color: tokens.text.secondary }} />
              </ListItemIcon>
              {t('manager.bookings.actions.editDetails')}
            </MenuItem>
          </span>
        </Tooltip>
        <Tooltip title={t('manager.bookings.actions.disabledNotImplemented')}>
          <span>
            <MenuItem
              disabled
              aria-label={`${t('manager.bookings.actions.cancelBooking')}. ${t('manager.bookings.actions.disabledNotImplemented')}`}
            >
              <ListItemIcon>
                <CancelOutlinedIcon fontSize="small" sx={{ color: tokens.state.errorFg }} />
              </ListItemIcon>
              <Typography component="span" sx={{ color: tokens.state.errorFg, fontWeight: 600 }}>
                {t('manager.bookings.actions.cancelBooking')}
              </Typography>
            </MenuItem>
          </span>
        </Tooltip>
      </Menu>

      <RegisterCheckInDialog
        open={Boolean(checkInTarget)}
        bookingId={checkInTarget?.id ?? null}
        scheduledCheckin={checkInTarget?.checkin ?? ''}
        onClose={() => setCheckInTarget(null)}
        onSuccess={async () => {
          setSnack({
            open: true,
            message: t('manager.bookings.checkIn.success'),
            severity: 'success',
          });
          bumpLoad();
        }}
      />

      <RegisterCheckOutDialog
        open={Boolean(checkOutTarget)}
        bookingId={checkOutTarget?.id ?? null}
        scheduledCheckout={checkOutTarget?.checkout ?? ''}
        onClose={() => setCheckOutTarget(null)}
        onSuccess={async () => {
          setSnack({
            open: true,
            message: t('manager.bookings.checkOut.success'),
            severity: 'success',
          });
          bumpLoad();
        }}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
