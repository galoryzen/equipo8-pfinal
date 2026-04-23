'use client';

import { useMemo, useState } from 'react';

import UnauthorizedDashboard from '@/app/manager/components/UnauthorizedDashboard';
import { useDashboardData } from '@/app/manager/hooks/useDashboardData';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

type DateRangeOption = 'last7' | 'last30' | 'currentMonth';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateDateRange(option: DateRangeOption): { from: string; to: string } {
  const today = new Date();
  const to = formatLocalDate(today);

  if (option === 'last7') {
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 6);
    return { from: formatLocalDate(fromDate), to };
  }

  if (option === 'last30') {
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 29);
    return { from: formatLocalDate(fromDate), to };
  }

  const fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: formatLocalDate(fromDate), to };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatVariation(value: number): { text: string; color: string; icon: React.ReactNode } {
  if (value > 0) {
    return {
      text: `+${value.toFixed(1)}%`,
      color: '#16A34A',
      icon: <ArrowUpwardIcon sx={{ fontSize: 14 }} />,
    };
  }
  if (value < 0) {
    return {
      text: `${value.toFixed(1)}%`,
      color: '#DC2626',
      icon: <ArrowDownwardIcon sx={{ fontSize: 14 }} />,
    };
  }
  return { text: '0.0%', color: '#6B7280', icon: <RemoveIcon sx={{ fontSize: 14 }} /> };
}

function getActivityIcon(type: string): React.ReactNode {
  if (type === 'BOOKING_CONFIRMED')
    return <CheckCircleIcon sx={{ color: '#16A34A', fontSize: 18 }} />;
  if (type === 'BOOKING_CANCELLED')
    return <ErrorOutlineIcon sx={{ color: '#DC2626', fontSize: 18 }} />;
  if (type === 'BOOKING_PENDING_CONFIRMATION')
    return <AccessTimeIcon sx={{ color: '#F59E0B', fontSize: 18 }} />;
  if (type === 'BOOKING_PENDING_PAYMENT')
    return <AccessTimeIcon sx={{ color: '#3B82F6', fontSize: 18 }} />;
  if (type === 'PAYMENT_CAPTURED')
    return <MonetizationOnOutlinedIcon sx={{ color: '#16A34A', fontSize: 18 }} />;
  if (type === 'REVIEW_CREATED') return <StarBorderIcon sx={{ color: '#A855F7', fontSize: 18 }} />;
  return <AccessTimeIcon sx={{ color: '#6B7280', fontSize: 18 }} />;
}

function getStatusChipColor(status: string): 'success' | 'info' | 'warning' | 'default' {
  if (status === 'CONFIRMED') return 'success';
  if (status === 'PENDING_PAYMENT') return 'info';
  if (status === 'PENDING_CONFIRMATION') return 'warning';
  return 'default';
}

function formatEnumFallback(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getDashboardStatusLabel(
  status: string,
  t: (key: string, options?: object) => string
): string {
  const normalizedStatus = status.toLowerCase();
  return t(`manager.dashboard.status.${normalizedStatus}`, {
    defaultValue: formatEnumFallback(status),
  });
}

function getDashboardActivityLabel(
  activityType: string,
  originalDescription: string,
  t: (key: string, options?: object) => string
): string {
  const normalizedType = activityType.toLowerCase();
  return t(`manager.dashboard.activity.${normalizedType}`, {
    defaultValue: originalDescription || formatEnumFallback(activityType),
  });
}

function BookingTrendChart({
  data,
  emptyText,
  ariaLabel,
}: {
  data: Array<{ date: string; bookings: number }>;
  emptyText: string;
  ariaLabel: string;
}): React.ReactNode {
  if (data.length === 0) {
    return <Typography sx={{ color: '#64748B' }}>{emptyText}</Typography>;
  }

  const width = 720;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 28 };
  const maxBookings = Math.max(...data.map((item) => item.bookings), 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const points = data.map((item, index) => {
    const x = padding.left + stepX * index;
    const y = padding.top + chartHeight - (item.bookings / maxBookings) * chartHeight;
    return { x, y, ...item };
  });

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="220"
        role="img"
        aria-label={ariaLabel}
      >
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          stroke="#CBD5E1"
        />
        <polyline fill="none" stroke="#2563EB" strokeWidth="3" points={polylinePoints} />
        {points.map((point) => (
          <g key={`${point.date}-${point.bookings}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="#2563EB" />
            <text x={point.x} y={height - 8} textAnchor="middle" fontSize="11" fill="#64748B">
              {formatShortDate(point.date)}
            </text>
          </g>
        ))}
      </svg>
    </Box>
  );
}

function MetricCard({
  label,
  value,
  variation,
}: {
  label: string;
  value: string;
  variation: number;
}): React.ReactNode {
  const trend = formatVariation(variation);
  return (
    <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #E2E8F0' }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
            {value}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: trend.color }}>
            {trend.icon}
            <Typography variant="body2" sx={{ color: trend.color, fontWeight: 700 }}>
              {trend.text}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton(): React.ReactNode {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #E2E8F0' }}>
      <CardContent>
        <Stack spacing={1.2}>
          <Skeleton variant="text" width="45%" />
          <Skeleton variant="text" width="65%" height={44} />
          <Skeleton variant="text" width="35%" />
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ManagerDashboardPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<DateRangeOption>('last7');

  const { from, to } = useMemo(() => calculateDateRange(range), [range]);
  const { data, loading, error } = useDashboardData(from, to);
  const isUnauthorized = error?.kind === 'unauthorized' || error?.status === 403;

  if (isUnauthorized) {
    return <UnauthorizedDashboard />;
  }

  const cards = [
    {
      label: t('manager.dashboard.metrics.totalBookings'),
      value: Math.round(data.metrics.totalBookings.value ?? 0).toLocaleString('en-US'),
      variation: data.metrics.totalBookings.variation,
    },
    {
      label: t('manager.dashboard.metrics.revenue'),
      value: formatCurrency(data.metrics.revenue.value ?? 0),
      variation: data.metrics.revenue.variation,
    },
    {
      label: t('manager.dashboard.metrics.occupancyRate'),
      value: `${(data.metrics.occupancyRate.value ?? 0).toFixed(1)}%`,
      variation: data.metrics.occupancyRate.variation,
    },
    {
      label: t('manager.dashboard.metrics.averageRating'),
      value: (data.metrics.averageRating.value ?? 0).toFixed(1),
      variation: data.metrics.averageRating.variation,
    },
  ];

  return (
    <Box sx={{ pb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography component="h1" sx={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A' }}>
            {t('manager.dashboard.title')}
          </Typography>
          <Typography sx={{ color: '#64748B', mt: 0.5 }}>
            {t('manager.dashboard.subtitle')}
          </Typography>
        </Box>

        <Select
          size="small"
          value={range}
          onChange={(event) => setRange(event.target.value as DateRangeOption)}
          sx={{ minWidth: 190, bgcolor: '#FFFFFF' }}
        >
          <MenuItem value="last7">{t('manager.dashboard.filters.last7days')}</MenuItem>
          <MenuItem value="last30">{t('manager.dashboard.filters.last30days')}</MenuItem>
          <MenuItem value="currentMonth">{t('manager.dashboard.filters.currentMonth')}</MenuItem>
        </Select>
      </Stack>

      {error && !isUnauthorized && (
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 'none', border: '1px solid #FECACA' }}>
          <CardContent>
            <Typography sx={{ color: '#B91C1C', fontWeight: 700 }}>
              {t('manager.dashboard.errors.loading')}
            </Typography>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Grid key={`metric-skeleton-${index}`} size={{ xs: 12, sm: 6, lg: 3 }}>
                <MetricCardSkeleton />
              </Grid>
            ))
          : cards.map((card) => (
              <Grid key={card.label} size={{ xs: 12, sm: 6, lg: 3 }}>
                <MetricCard label={card.label} value={card.value} variation={card.variation} />
              </Grid>
            ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card
            sx={{ minHeight: 260, borderRadius: 3, boxShadow: 'none', border: '1px solid #E2E8F0' }}
          >
            <CardContent>
              <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 2 }}>
                {t('manager.dashboard.sections.bookingTrends')}
              </Typography>
              <Box
                sx={{
                  minHeight: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {loading ? (
                  <Skeleton variant="rectangular" width="100%" height={190} />
                ) : (
                  <BookingTrendChart
                    data={data.bookingTrends}
                    emptyText={t('manager.dashboard.empty.noData')}
                    ariaLabel={t('manager.dashboard.sections.bookingTrends')}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card
            sx={{ minHeight: 260, borderRadius: 3, boxShadow: 'none', border: '1px solid #E2E8F0' }}
          >
            <CardContent>
              <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 2 }}>
                {t('manager.dashboard.sections.recentActivity')}
              </Typography>
              {loading ? (
                <Stack spacing={1.25}>
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                </Stack>
              ) : data.recentActivity.length === 0 ? (
                <Typography sx={{ color: '#64748B' }}>
                  {t('manager.dashboard.empty.noData')}
                </Typography>
              ) : (
                <List disablePadding sx={{ maxHeight: 190, overflowY: 'auto' }}>
                  {data.recentActivity.map((activity, index) => (
                    <ListItem
                      key={`${activity.timestamp}-${index}`}
                      disableGutters
                      sx={{ alignItems: 'flex-start' }}
                    >
                      <ListItemIcon sx={{ minWidth: 28, mt: 0.2 }}>
                        {getActivityIcon(activity.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            sx={{ color: '#0F172A', fontWeight: 600, fontSize: '0.9rem' }}
                          >
                            {getDashboardActivityLabel(activity.type, activity.description, t)}
                          </Typography>
                        }
                        secondary={
                          <Typography sx={{ color: '#64748B', fontSize: '0.78rem', mt: 0.2 }}>
                            {formatDateTime(activity.timestamp)}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #E2E8F0' }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 1.5 }}>
            {t('manager.dashboard.sections.upcomingCheckins')}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('manager.dashboard.table.guest')}</TableCell>
                <TableCell>{t('manager.dashboard.table.roomType')}</TableCell>
                <TableCell>{t('manager.dashboard.table.checkIn')}</TableCell>
                <TableCell>{t('manager.dashboard.table.checkOut')}</TableCell>
                <TableCell>{t('manager.dashboard.table.status')}</TableCell>
                <TableCell align="right">{t('manager.dashboard.table.amount')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton variant="text" />
                  </TableCell>
                </TableRow>
              ) : data.upcomingCheckins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography sx={{ py: 2, textAlign: 'center', color: '#64748B' }}>
                      {t('manager.dashboard.empty.noUpcomingCheckins')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.upcomingCheckins.map((checkin, index) => (
                  <TableRow key={`${checkin.guest}-${checkin.checkIn}-${index}`}>
                    <TableCell>{checkin.guest}</TableCell>
                    <TableCell>{checkin.roomType}</TableCell>
                    <TableCell>{formatShortDate(checkin.checkIn)}</TableCell>
                    <TableCell>{formatShortDate(checkin.checkOut)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getDashboardStatusLabel(checkin.status, t)}
                        color={getStatusChipColor(checkin.status)}
                        size="small"
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(checkin.amount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
