'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { getMe } from '@/app/lib/api/auth';
import {
  BookingApiError,
  type HotelBookingsMetrics,
  exportPartnerBookingsCsv,
  fetchHotelBookingsMetrics,
  listPartnerBookings,
} from '@/app/lib/api/booking';
import { getHotelRoomTypes, getHotels } from '@/app/lib/api/manager';
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
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
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
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import RegisterCheckInDialog from '@/components/manager/bookings/RegisterCheckInDialog';
import RegisterCheckOutDialog from '@/components/manager/bookings/RegisterCheckOutDialog';

type TabKey = 'all' | 'checkin_today' | 'checkout_today' | 'pending' | 'cancelled';

const BOOKING_STATUS_FILTER_VALUES = [
  'CONFIRMED',
  'PENDING_CONFIRMATION',
  'PENDING_PAYMENT',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
] as const;

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
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
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

  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [filterStatusAll, setFilterStatusAll] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [catalogRoomTypes, setCatalogRoomTypes] = useState<{ id: string; name: string }[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  const isClientTab = tab === 'checkin_today' || tab === 'checkout_today';

  const effectiveStatus = useMemo(() => {
    const tabDerived =
      tab === 'pending' ? 'PENDING_CONFIRMATION' : tab === 'cancelled' ? 'CANCELLED' : undefined;
    return tabDerived ?? (filterStatusAll || undefined);
  }, [tab, filterStatusAll]);

  const exportFilters = useMemo(
    () => ({
      status: effectiveStatus,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      room_type_id: roomTypeId || undefined,
      q: debouncedQ || undefined,
    }),
    [effectiveStatus, dateFrom, dateTo, roomTypeId, debouncedQ]
  );

  const roomTypeSelectOptions = useMemo(() => {
    const map = new Map<string, string>();
    catalogRoomTypes.forEach((x) => map.set(x.id, x.name));
    rows.forEach((b) => {
      const label = b.room_type_name?.trim();
      if (label && !map.has(b.room_type_id)) map.set(b.room_type_id, label);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [catalogRoomTypes, rows]);

  const hasAdvancedFilters = Boolean(
    searchInput.trim() || filterStatusAll || dateFrom || dateTo || roomTypeId
  );

  const pageSize = 10;

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 400);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const hotels = await getHotels(1, 100);
        const map = new Map<string, string>();
        for (const h of hotels.items) {
          try {
            const rt = await getHotelRoomTypes(h.id, 1, 100);
            for (const r of rt.items) map.set(r.id, r.name);
          } catch {
            /* skip property */
          }
        }
        if (!cancelled) {
          setCatalogRoomTypes([...map.entries()].map(([bid, name]) => ({ id: bid, name })));
        }
      } catch {
        if (!cancelled) setCatalogRoomTypes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const isAdmin = user?.role === 'ADMIN';
      console.log('isAdmin', isAdmin);
      const m = await fetchHotelBookingsMetrics(isAdmin);
      setMetrics(m);
    } catch (e) {
      setMetrics(EMPTY_METRICS);
      setMetricsError(e instanceof Error ? e.message : t('manager.bookings.stats.loadError'));
    } finally {
      setMetricsLoading(false);
    }
  }, [t, user?.role]);

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
        const res = await listPartnerBookings({
          status: effectiveStatus,
          page,
          page_size: pageSize,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          room_type_id: roomTypeId || undefined,
          q: debouncedQ || undefined,
        });
        setRows(res.items);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.total_pages));
      }
    } catch (e) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      const msg =
        e instanceof BookingApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : t('manager.bookings.history.loadError');
      setError(msg);
      if (e instanceof BookingApiError && e.status === 422) {
        setSnack({
          open: true,
          message: t('manager.bookings.history.filtersInvalid'),
          severity: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [tab, page, isClientTab, t, effectiveStatus, dateFrom, dateTo, roomTypeId, debouncedQ]);

  useEffect(() => {
    void load();
  }, [load, loadKey]);

  useEffect(() => {
    if (user) {
      void loadMetrics();
    }
  }, [loadMetrics, loadKey, user]);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedQ, filterStatusAll, dateFrom, dateTo, roomTypeId]);

  useEffect(() => {
    if (tab !== 'all') setFilterStatusAll('');
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

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedQ('');
    setFilterStatusAll('');
    setDateFrom('');
    setDateTo('');
    setRoomTypeId('');
  };

  const handleExportCsv = useCallback(async () => {
    if (isClientTab) return;
    setExportLoading(true);
    try {
      await exportPartnerBookingsCsv(exportFilters);
      setSnack({
        open: true,
        message: t('manager.bookings.history.exportSuccess'),
        severity: 'success',
      });
    } catch (e) {
      const msg =
        e instanceof BookingApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : t('manager.bookings.history.exportError');
      setSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  }, [exportFilters, isClientTab, t]);

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
          disabled
          component={Link}
          href="/traveler/search"
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            bgcolor: tokens.brand.accentOrangeContained,
            color: '#FFFFFF',
            px: 2.5,
            '&:hover': {
              bgcolor: tokens.brand.accentOrangeContained,
              filter: 'brightness(0.95)',
            },
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

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            useFlexGap
            flexWrap="wrap"
            alignItems={{ xs: 'stretch', md: 'center' }}
            sx={{ mb: 2 }}
          >
            <TextField
              size="small"
              placeholder={t('manager.bookings.history.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={isClientTab}
              inputProps={{
                'data-testid': 'bookings-search-input',
                'aria-label': t('manager.bookings.history.searchPlaceholder'),
              }}
              sx={{ minWidth: { xs: '100%', md: 240 }, flex: { xs: '1 1 100%', md: '0 1 240px' } }}
            />
            <FormControl
              size="small"
              sx={{ minWidth: 170 }}
              disabled={isClientTab || tab !== 'all'}
              data-testid="bookings-status-filter"
            >
              <InputLabel id="bookings-status-filter-label">
                {t('manager.bookings.table.status')}
              </InputLabel>
              <Select
                labelId="bookings-status-filter-label"
                label={t('manager.bookings.table.status')}
                value={filterStatusAll}
                onChange={(e) => setFilterStatusAll(String(e.target.value))}
              >
                <MenuItem value="">
                  <em>{t('manager.bookings.history.statusAll')}</em>
                </MenuItem>
                {BOOKING_STATUS_FILTER_VALUES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {statusLabel(s)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="date"
              size="small"
              label={t('manager.bookings.history.dateFrom')}
              InputLabelProps={{ shrink: true }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              disabled={isClientTab}
              inputProps={{ 'data-testid': 'bookings-date-from' }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              type="date"
              size="small"
              label={t('manager.bookings.history.dateTo')}
              InputLabelProps={{ shrink: true }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              disabled={isClientTab}
              inputProps={{ 'data-testid': 'bookings-date-to' }}
              sx={{ minWidth: 150 }}
            />
            <FormControl
              size="small"
              sx={{ minWidth: 200 }}
              disabled={isClientTab}
              data-testid="bookings-room-type-filter"
            >
              <InputLabel id="bookings-room-type-label">
                {t('manager.bookings.table.roomType')}
              </InputLabel>
              <Select
                labelId="bookings-room-type-label"
                label={t('manager.bookings.table.roomType')}
                value={roomTypeId}
                onChange={(e) => setRoomTypeId(String(e.target.value))}
              >
                <MenuItem value="">
                  <em>{t('manager.bookings.history.roomTypeAll')}</em>
                </MenuItem>
                {roomTypeSelectOptions.map(([id, name]) => (
                  <MenuItem key={id} value={id}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              variant="text"
              disabled={isClientTab || !hasAdvancedFilters}
              onClick={clearFilters}
            >
              {t('manager.bookings.history.clearFilters')}
            </Button>
            <Tooltip title={isClientTab ? t('manager.bookings.history.exportDisabledTabs') : ''}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={isClientTab || exportLoading}
                  onClick={() => void handleExportCsv()}
                  data-testid="bookings-export-csv"
                >
                  {exportLoading ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      {t('manager.bookings.history.exporting')}
                    </>
                  ) : (
                    t('manager.bookings.history.exportCsv')
                  )}
                </Button>
              </span>
            </Tooltip>
          </Stack>

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
                  {t('manager.bookings.table.bookingDate')}
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
                      <TableCell colSpan={8}>
                        <Skeleton variant="text" height={28} />
                      </TableCell>
                    </TableRow>
                  ))
                : null}
              {!loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
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
                                color: tokens.brand.accentOrangeFg,
                                mt: 0.25,
                              }}
                            >
                              {bookingRef}
                            </Typography>
                            {b.guest_email?.trim() ? (
                              <Typography
                                sx={{
                                  fontSize: '0.75rem',
                                  color: tokens.text.secondary,
                                  fontWeight: 600,
                                  mt: 0.25,
                                }}
                              >
                                {b.guest_email.trim()}
                              </Typography>
                            ) : null}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{formatShortDate(b.created_at)}</TableCell>
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
                <CheckCircleOutlineIcon sx={{ color: tokens.brand.accentOrangeFg, fontSize: 22 }} />
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
              icon={
                <HourglassEmptyOutlinedIcon
                  sx={{ color: tokens.dashboard.statusChip.pendingConfirmation.fg, fontSize: 22 }}
                />
              }
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
        {menuBooking &&
        (menuBooking.can_register_check_in ||
          (user?.role === 'ADMIN' && bookingHasActionMenu(menuBooking))) ? (
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
        {menuBooking &&
        (menuBooking.can_register_check_out ||
          (user?.role === 'ADMIN' && bookingHasActionMenu(menuBooking))) ? (
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
