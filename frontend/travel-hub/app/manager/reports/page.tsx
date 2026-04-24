'use client';

import { useEffect, useMemo, useState } from 'react';

import { getMe, getUserById } from '@/app/lib/api/auth';
import { useRevenueReport } from '@/app/manager/hooks/useRevenueReport';
import { tokens } from '@/lib/theme/tokens';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DownloadIcon from '@mui/icons-material/Download';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

type ChartMode = 'revenue' | 'occupancy';

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatVariation(value: number): { text: string; color: string; icon: React.ReactNode } {
  if (value > 0) {
    return {
      text: `+${value.toFixed(1)}%`,
      color: tokens.state.successFg,
      icon: <ArrowUpwardIcon sx={{ fontSize: 14 }} />,
    };
  }
  if (value < 0) {
    return {
      text: `${value.toFixed(1)}%`,
      color: tokens.state.errorFg,
      icon: <ArrowDownwardIcon sx={{ fontSize: 14 }} />,
    };
  }
  return {
    text: '0.0%',
    color: tokens.text.secondary,
    icon: <RemoveIcon sx={{ fontSize: 14 }} />,
  };
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function dateToInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function RevenueTrendChart({
  points,
  mode,
  emptyText,
  ariaLabel,
}: {
  points: Array<{ date: string; revenue: number; occupancyRate: number }>;
  mode: ChartMode;
  emptyText: string;
  ariaLabel: string;
}) {
  if (points.length === 0) {
    return <Typography sx={{ color: tokens.dashboard.mutedText }}>{emptyText}</Typography>;
  }

  const values = points.map((item) => (mode === 'revenue' ? item.revenue : item.occupancyRate));
  const maxValue = Math.max(...values, 1);
  const width = 740;
  const height = 240;
  const padding = { top: 20, right: 20, bottom: 34, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  const chartPoints = points.map((item, index) => {
    const value = mode === 'revenue' ? item.revenue : item.occupancyRate;
    return {
      ...item,
      value,
      x: padding.left + stepX * index,
      y: padding.top + chartHeight - (value / maxValue) * chartHeight,
    };
  });

  const polylinePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="240"
        role="img"
        aria-label={ariaLabel}
      >
        <title>{ariaLabel}</title>
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          stroke={tokens.border.subtleHover}
        />
        <polyline
          fill="none"
          stroke={tokens.dashboard.chart.line}
          strokeWidth="3"
          points={polylinePoints}
        />
        {chartPoints.map((point) => (
          <g key={`${point.date}-${point.value}`}>
            <circle cx={point.x} cy={point.y} r="4" fill={tokens.dashboard.chart.line} />
            <text
              x={point.x}
              y={height - 10}
              textAnchor="middle"
              fontSize="11"
              fill={tokens.dashboard.mutedText}
            >
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
}) {
  const trend = formatVariation(variation);
  return (
    <Card sx={{ borderRadius: 3, boxShadow: 'none', border: `1px solid ${tokens.border.subtle}` }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ color: tokens.dashboard.mutedText, fontWeight: 600 }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: tokens.dashboard.heading }}>
            {value}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: trend.color }}>
            {trend.icon}
            <Typography variant="body2" sx={{ fontWeight: 700, color: trend.color }}>
              {trend.text}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ManagerReportsPage() {
  const { t } = useTranslation();
  const { data, loading, error, hasLoaded, generateReport } = useRevenueReport();
  const [hotelId, setHotelId] = useState('');
  const [hotelLabel, setHotelLabel] = useState(t('manager.reports.filters.myHotel'));
  const [hotelLoading, setHotelLoading] = useState(true);
  const [hotelResolveError, setHotelResolveError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>('revenue');
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return dateToInput(start);
  });
  const [toDate, setToDate] = useState(() => dateToInput(new Date()));

  const hasEmptyReport =
    hasLoaded &&
    !loading &&
    !error &&
    data.trends.length === 0 &&
    data.revenueByRoomType.length === 0 &&
    data.totalAggregatedRevenue === 0;

  const metrics = useMemo(
    () => [
      {
        label: t('manager.reports.kpis.totalRevenue'),
        value: formatCurrency(data.kpis.totalRevenue.value, data.metadata.currency),
        variation: data.kpis.totalRevenue.variation,
      },
      {
        label: t('manager.reports.kpis.adr'),
        value: formatCurrency(data.kpis.adr.value, data.metadata.currency),
        variation: data.kpis.adr.variation,
      },
      {
        label: t('manager.reports.kpis.occupancyRate'),
        value: formatPercent(data.kpis.occupancyRate.value),
        variation: data.kpis.occupancyRate.variation,
      },
    ],
    [data, t]
  );

  useEffect(() => {
    let cancelled = false;

    function toTitle(value: string): string {
      return value
        .split(/[\s_-]+/g)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
        .join(' ');
    }

    function deriveHotelNameFromEmail(email: string): string {
      const domain = email.split('@')[1] ?? '';
      const org = domain.split('.')[0] ?? '';
      if (!org) return t('manager.reports.filters.myHotel');
      if (org.startsWith('hoteles') && org.length > 'hoteles'.length) {
        return `Hoteles ${toTitle(org.slice('hoteles'.length))}`;
      }
      if (org.startsWith('cadena') && org.length > 'cadena'.length) {
        return `Cadena ${toTitle(org.slice('cadena'.length))}`;
      }
      if (org.startsWith('grupo') && org.length > 'grupo'.length) {
        return `Grupo ${toTitle(org.slice('grupo'.length))}`;
      }
      return toTitle(org);
    }

    async function resolveHotel() {
      setHotelLoading(true);
      setHotelResolveError(null);
      try {
        const me = await getMe();
        if (!me || !me.id) {
          throw new Error(t('manager.reports.states.hotelNotResolved'));
        }
        const profile = await getUserById(me.id);
        const resolvedHotelId = profile.hotel_id ?? me.hotel_id ?? '';
        if (!resolvedHotelId) {
          throw new Error(t('manager.reports.states.hotelNotResolved'));
        }
        if (!cancelled) {
          setHotelId(resolvedHotelId);
          setHotelLabel(deriveHotelNameFromEmail(profile.email || me.email));
        }
      } catch (caught) {
        if (!cancelled) {
          setHotelResolveError(
            caught instanceof Error ? caught.message : t('manager.reports.states.hotelNotResolved')
          );
          setHotelId('');
        }
      } finally {
        if (!cancelled) setHotelLoading(false);
      }
    }

    void resolveHotel();
    return () => {
      cancelled = true;
    };
  }, [t]);

  function handleGenerateReport() {
    if (!hotelId) {
      setHotelResolveError(t('manager.reports.states.hotelNotResolved'));
      return;
    }
    setHotelResolveError(null);
    void generateReport({
      hotelId,
      from: fromDate,
      to: toDate,
    });
  }

  return (
    <Box sx={{ pb: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography
            component="h1"
            sx={{ fontSize: '2rem', fontWeight: 800, color: tokens.dashboard.heading }}
          >
            {t('manager.reports.title')}
          </Typography>
          <Typography sx={{ color: tokens.dashboard.mutedText, mt: 0.5 }}>
            {t('manager.reports.subtitle')}
          </Typography>
        </Box>

        <Card
          sx={{ borderRadius: 3, boxShadow: 'none', border: `1px solid ${tokens.border.subtle}` }}
        >
          <CardContent>
            <Grid container spacing={2} alignItems="end">
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="manager-reports-hotel-label">
                    {t('manager.reports.filters.hotel')}
                  </InputLabel>
                  <Select
                    labelId="manager-reports-hotel-label"
                    value={hotelId}
                    label={t('manager.reports.filters.hotel')}
                    onChange={(event) => setHotelId(event.target.value)}
                    disabled={hotelLoading}
                  >
                    <MenuItem value={hotelId || ''}>{hotelLabel}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label={t('manager.reports.filters.from')}
                  type="date"
                  fullWidth
                  size="small"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label={t('manager.reports.filters.to')}
                  type="date"
                  fullWidth
                  size="small"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleGenerateReport}
                  disabled={loading || hotelLoading || !hotelId || !fromDate || !toDate}
                  sx={{
                    py: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    bgcolor: tokens.brand.accentOrange,
                    color: '#111827',
                    '&:hover': { bgcolor: tokens.brand.accentOrange, filter: 'brightness(0.95)' },
                  }}
                >
                  {t('manager.reports.actions.generate')}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {!hasLoaded && (
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 'none',
              border: `1px dashed ${tokens.border.subtleHover}`,
            }}
          >
            <CardContent>
              <Typography sx={{ color: tokens.dashboard.mutedText }}>
                {t('manager.reports.states.initial')}
              </Typography>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 'none',
              border: `1px solid ${tokens.state.warningBorder}`,
            }}
          >
            <CardContent>
              <Typography sx={{ color: tokens.state.warningFg, fontWeight: 700 }}>
                {t('manager.reports.states.error')}
              </Typography>
            </CardContent>
          </Card>
        )}

        {hotelResolveError && (
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 'none',
              border: `1px solid ${tokens.state.warningBorder}`,
            }}
          >
            <CardContent>
              <Typography sx={{ color: tokens.state.warningFg, fontWeight: 700 }}>
                {hotelResolveError}
              </Typography>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Grid container spacing={2}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <Grid key={`report-skeleton-${idx}`} size={{ xs: 12, md: 4 }}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: 'none',
                    border: `1px solid ${tokens.border.subtle}`,
                  }}
                >
                  <CardContent>
                    <Skeleton variant="text" width="45%" />
                    <Skeleton variant="text" width="65%" height={44} />
                    <Skeleton variant="text" width="35%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid size={{ xs: 12 }}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: 'none',
                  border: `1px solid ${tokens.border.subtle}`,
                }}
              >
                <CardContent>
                  <Skeleton variant="rectangular" width="100%" height={220} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {hasEmptyReport && (
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 'none',
              border: `1px dashed ${tokens.border.subtleHover}`,
            }}
          >
            <CardContent>
              <Typography sx={{ color: tokens.dashboard.mutedText }}>
                {t('manager.reports.states.empty')}
              </Typography>
            </CardContent>
          </Card>
        )}

        {hasLoaded && !loading && !error && !hasEmptyReport && (
          <>
            <Grid container spacing={2}>
              {metrics.map((metric) => (
                <Grid key={metric.label} size={{ xs: 12, md: 4 }}>
                  <MetricCard
                    label={metric.label}
                    value={metric.value}
                    variation={metric.variation}
                  />
                </Grid>
              ))}
            </Grid>

            <Card
              sx={{
                borderRadius: 3,
                boxShadow: 'none',
                border: `1px solid ${tokens.border.subtle}`,
              }}
            >
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  spacing={2}
                  sx={{ mb: 2 }}
                >
                  <Typography sx={{ fontWeight: 700, color: tokens.dashboard.heading }}>
                    {t('manager.reports.sections.trends')}
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    value={chartMode}
                    onChange={(_, value: ChartMode | null) => value && setChartMode(value)}
                    size="small"
                  >
                    <ToggleButton value="revenue">
                      {t('manager.reports.chart.revenue')}
                    </ToggleButton>
                    <ToggleButton value="occupancy">
                      {t('manager.reports.chart.occupancy')}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                <RevenueTrendChart
                  points={data.trends}
                  mode={chartMode}
                  emptyText={t('manager.reports.states.empty')}
                  ariaLabel={t('manager.reports.sections.trends')}
                />
              </CardContent>
            </Card>

            <Card
              sx={{
                borderRadius: 3,
                boxShadow: 'none',
                border: `1px solid ${tokens.border.subtle}`,
              }}
            >
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  spacing={2}
                  sx={{ mb: 1.5 }}
                >
                  <Typography sx={{ fontWeight: 700, color: tokens.dashboard.heading }}>
                    {t('manager.reports.sections.byRoomType')}
                  </Typography>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    {t('manager.reports.actions.download')}
                  </Button>
                </Stack>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('manager.reports.table.roomType')}</TableCell>
                      <TableCell align="right">{t('manager.reports.table.unitsSold')}</TableCell>
                      <TableCell align="right">{t('manager.reports.table.avgRate')}</TableCell>
                      <TableCell align="right">{t('manager.reports.table.totalRevenue')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.revenueByRoomType.map((row) => (
                      <TableRow key={row.roomType}>
                        <TableCell>{row.roomType}</TableCell>
                        <TableCell align="right">{row.unitsSold.toLocaleString('en-US')}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.avgRate, data.metadata.currency)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.totalRevenue, data.metadata.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                        {t('manager.reports.table.totalAggregatedRevenue')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(data.totalAggregatedRevenue, data.metadata.currency)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </Stack>
    </Box>
  );
}
