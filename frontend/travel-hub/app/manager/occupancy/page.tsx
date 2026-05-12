'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { getMe } from '@/app/lib/api/auth';
import { getHotelRoomTypes, getHotels } from '@/app/lib/api/manager';
import {
  getOccupancyCalendar,
  getOccupancyDailyBreakdown,
  getOccupancyProjection,
} from '@/app/lib/api/occupancy';
import type { ManagerHotelItem } from '@/app/lib/types/manager';
import type { OccupancyDailyBreakdownResponse, OccupancyDay } from '@/app/lib/types/occupancy';
import { dateFormattingLocale } from '@/lib/i18n/dateLocale';
import { tokens } from '@/lib/theme/tokens';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function monthInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function parseMonthInput(value: string): { year: number; monthIndex: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, monthIndex: month - 1 };
}

function monthBoundsIso(year: number, monthIndex: number): { date_from: string; date_to: string } {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  return {
    date_from: `${first.getFullYear()}-${pad2(first.getMonth() + 1)}-${pad2(first.getDate())}`,
    date_to: `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`,
  };
}

function buildMonthCells(year: number, monthIndex: number): Array<number | null> {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoDay(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function levelStyle(level: OccupancyDay['occupancy_level']): {
  cellBg: string;
  badgeBg: string;
  badgeFg: string;
} {
  switch (level) {
    case 'HIGH':
      return {
        cellBg: tokens.state.successBg,
        badgeBg: tokens.state.successFg,
        badgeFg: '#fff',
      };
    case 'MEDIUM':
      return {
        cellBg: tokens.state.warningBg,
        badgeBg: tokens.brand.accentOrangeContained,
        badgeFg: '#fff',
      };
    case 'LOW':
    default:
      return {
        cellBg: tokens.surface.paper,
        badgeBg: tokens.state.errorFg,
        badgeFg: '#fff',
      };
  }
}

const PROJECTION_PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
type ProjectionPageSize = (typeof PROJECTION_PAGE_SIZE_OPTIONS)[number];

function formatShortDate(isoDate: string, locale: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

type ProjectionPeriodAlert = {
  type: string;
  date_from: string;
  date_to: string;
  average_occupancy_rate: number;
};

type ProjectionDayAlert = { date: string; message: string };

type ProjectionRow =
  | { kind: 'period'; item: ProjectionPeriodAlert }
  | { kind: 'day'; item: ProjectionDayAlert };

function OccupancyProjectionAlerts({
  periods,
  days,
  loading,
  errorMessage,
}: {
  periods: ProjectionPeriodAlert[];
  days: ProjectionDayAlert[];
  loading: boolean;
  errorMessage: string | null;
}) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ProjectionPageSize>(5);
  const locale = dateFormattingLocale(i18n.language ?? 'en-US');

  const flatRows = useMemo((): ProjectionRow[] => {
    const rows: ProjectionRow[] = [];
    for (const p of periods) rows.push({ kind: 'period', item: p });
    for (const d of days) rows.push({ kind: 'day', item: d });
    return rows;
  }, [periods, days]);

  const total = flatRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const start = (effectivePage - 1) * pageSize;
  const pageRows = flatRows.slice(start, start + pageSize);
  const rangeTo = Math.min(start + pageRows.length, total);

  const handlePageSizeChange = (event: SelectChangeEvent<number>) => {
    const next = Number(event.target.value);
    if (next === 5 || next === 10 || next === 25) {
      setPageSize(next);
      setPage(1);
    }
  };

  if (loading) {
    return <Skeleton variant="rounded" height={80} />;
  }
  if (errorMessage) {
    return <Alert severity="error">{errorMessage}</Alert>;
  }
  if (periods.length === 0 && days.length === 0) {
    return (
      <Typography
        variant="body2"
        sx={{ color: tokens.dashboard.mutedText }}
        data-testid="occupancy-projection-empty"
      >
        {t('manager.occupancy.projection.empty')}
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25} data-testid="occupancy-projection-alerts">
      {periods.length > 0 ? (
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: tokens.dashboard.heading }}
          data-testid="occupancy-projection-periods-summary"
        >
          {t('manager.occupancy.projection.periodsSummary', { count: periods.length })}
        </Typography>
      ) : null}
      {periods.length === 0 && days.length > 0 ? (
        <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.dashboard.heading }}>
          {t('manager.occupancy.projection.dailySummary', { count: days.length })}
        </Typography>
      ) : null}

      {pageRows.map((row, i) =>
        row.kind === 'period' ? (
          <Alert
            key={`p-${row.item.date_from}-${row.item.date_to}-${start + i}`}
            severity="warning"
            variant="outlined"
            data-testid="occupancy-projection-period-alert"
          >
            {t('manager.occupancy.projection.period', {
              from: formatShortDate(row.item.date_from, locale),
              to: formatShortDate(row.item.date_to, locale),
              rate: row.item.average_occupancy_rate,
            })}
          </Alert>
        ) : (
          <Alert
            key={`d-${row.item.date}-${start + i}`}
            severity="info"
            variant="outlined"
            data-testid="occupancy-projection-day-alert"
          >
            {row.item.date}: {row.item.message}
          </Alert>
        )
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        flexWrap="wrap"
        sx={{ pt: 0.5 }}
      >
        <Typography
          variant="body2"
          sx={{ color: tokens.text.secondary }}
          data-testid="occupancy-projection-range"
        >
          {t('manager.occupancy.projection.rangeSummary', {
            from: total === 0 ? 0 : start + 1,
            to: rangeTo,
            total,
          })}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="occupancy-projection-page-size-label">
              {t('manager.occupancy.projection.pageSizeLabel')}
            </InputLabel>
            <Select<number>
              labelId="occupancy-projection-page-size-label"
              label={t('manager.occupancy.projection.pageSizeLabel')}
              value={pageSize}
              onChange={handlePageSizeChange}
              data-testid="occupancy-projection-page-size"
            >
              {PROJECTION_PAGE_SIZE_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {totalPages > 1 ? (
            <Pagination
              count={totalPages}
              page={effectivePage}
              onChange={(_, value) => setPage(value)}
              color="primary"
              size="small"
              data-testid="occupancy-projection-pagination"
            />
          ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
}

export default function ManagerOccupancyPage() {
  const { t } = useTranslation();
  const [role, setRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  const [hotels, setHotels] = useState<ManagerHotelItem[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(true);
  const [hotelsError, setHotelsError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [roomTypesLoading, setRoomTypesLoading] = useState(false);
  const [roomTypeOptions, setRoomTypeOptions] = useState<Array<{ id: string; name: string }>>([]);

  const [monthValue, setMonthValue] = useState(() => monthInputValue(new Date()));

  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarDays, setCalendarDays] = useState<OccupancyDay[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<OccupancyDailyBreakdownResponse | null>(null);

  const [projectionLoading, setProjectionLoading] = useState(false);
  const [projectionError, setProjectionError] = useState<string | null>(null);
  const [projectionAlerts, setProjectionAlerts] = useState<
    Array<{ type: string; date_from: string; date_to: string; average_occupancy_rate: number }>
  >([]);
  const [projectionDayAlerts, setProjectionDayAlerts] = useState<
    Array<{ date: string; message: string }>
  >([]);
  const [projectionListNonce, setProjectionListNonce] = useState(0);

  const parsedMonth = useMemo(() => parseMonthInput(monthValue), [monthValue]);
  const gridCells = useMemo(() => {
    if (!parsedMonth) return [];
    return buildMonthCells(parsedMonth.year, parsedMonth.monthIndex);
  }, [parsedMonth]);

  const dayByIso = useMemo(() => {
    const m = new Map<string, OccupancyDay>();
    for (const d of calendarDays) m.set(d.date, d);
    return m;
  }, [calendarDays]);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setRole(me?.role ?? null);
      })
      .finally(() => {
        if (!cancelled) setRoleChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!roleChecked) return;
    const allowed = role === 'HOTEL' || role === 'MANAGER';
    if (!allowed) return;

    let cancelled = false;
    setHotelsLoading(true);
    setHotelsError(null);
    getHotels(1, 100)
      .then((res) => {
        if (cancelled) return;
        const items = res.items ?? [];
        setHotels(items);
        if (items.length === 1) {
          setPropertyId(items[0].id);
        } else if (items.length > 0) {
          setPropertyId((prev) => prev || items[0].id);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setHotelsError(
            e instanceof Error ? e.message : t('manager.occupancy.states.hotelsError')
          );
      })
      .finally(() => {
        if (!cancelled) setHotelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, roleChecked, t]);

  useEffect(() => {
    if (!propertyId) {
      setRoomTypeOptions([]);
      setRoomTypeId('');
      return;
    }
    let cancelled = false;
    setRoomTypesLoading(true);
    getHotelRoomTypes(propertyId)
      .then((res) => {
        if (cancelled) return;
        const opts = (res.items ?? []).map((rt) => ({ id: rt.id, name: rt.name }));
        setRoomTypeOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setRoomTypeOptions([]);
      })
      .finally(() => {
        if (!cancelled) setRoomTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const loadCalendar = useCallback(async () => {
    if (!parsedMonth || !propertyId) return;
    const { date_from, date_to } = monthBoundsIso(parsedMonth.year, parsedMonth.monthIndex);
    setCalendarLoading(true);
    setCalendarError(null);
    try {
      const data = await getOccupancyCalendar({
        date_from,
        date_to,
        property_id: propertyId,
        room_type_id: roomTypeId || undefined,
      });
      setCalendarDays(data.days);
    } catch (e: unknown) {
      setCalendarDays([]);
      setCalendarError(
        e instanceof Error ? e.message : t('manager.occupancy.states.calendarError')
      );
    } finally {
      setCalendarLoading(false);
    }
  }, [parsedMonth, propertyId, roomTypeId, t]);

  useEffect(() => {
    if (!propertyId || !parsedMonth) return;
    void loadCalendar();
  }, [propertyId, parsedMonth, roomTypeId, loadCalendar]);

  const loadProjection = useCallback(async () => {
    if (!propertyId) return;
    setProjectionLoading(true);
    setProjectionError(null);
    try {
      const data = await getOccupancyProjection({ property_id: propertyId, days: 90 });
      setProjectionAlerts(data.alerts ?? []);
      const dayAlerts: Array<{ date: string; message: string }> = [];
      for (const d of data.days ?? []) {
        if (d.alert?.message) {
          dayAlerts.push({ date: d.date, message: d.alert.message });
        }
      }
      setProjectionDayAlerts(dayAlerts);
      setProjectionListNonce((n) => n + 1);
    } catch (e: unknown) {
      setProjectionAlerts([]);
      setProjectionDayAlerts([]);
      setProjectionListNonce((n) => n + 1);
      setProjectionError(
        e instanceof Error ? e.message : t('manager.occupancy.states.projectionError')
      );
    } finally {
      setProjectionLoading(false);
    }
  }, [propertyId, t]);

  useEffect(() => {
    if (!propertyId) return;
    void loadProjection();
  }, [propertyId, loadProjection]);

  const loadBreakdown = useCallback(
    async (date: string) => {
      if (!propertyId) return;
      setBreakdownLoading(true);
      setBreakdownError(null);
      try {
        const data = await getOccupancyDailyBreakdown({ property_id: propertyId, date });
        setBreakdown(data);
      } catch (e: unknown) {
        setBreakdown(null);
        setBreakdownError(
          e instanceof Error ? e.message : t('manager.occupancy.states.breakdownError')
        );
      } finally {
        setBreakdownLoading(false);
      }
    },
    [propertyId, t]
  );

  useEffect(() => {
    if (!selectedDate || !propertyId) {
      setBreakdown(null);
      setBreakdownError(null);
      return;
    }
    void loadBreakdown(selectedDate);
  }, [selectedDate, propertyId, loadBreakdown]);

  const handlePickDay = (year: number, monthIndex: number, day: number) => {
    const iso = isoDay(year, monthIndex, day);
    setSelectedDate(iso);
  };

  if (!roleChecked) {
    return (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress aria-label={t('a11y.loading')} />
      </Box>
    );
  }

  if (role !== 'HOTEL' && role !== 'MANAGER') {
    return (
      <Alert severity="warning" sx={{ borderRadius: 2 }}>
        {t('manager.occupancy.states.forbidden')}
      </Alert>
    );
  }

  const showHotelsSkeleton = hotelsLoading;
  const filtersDisabled = hotelsLoading || hotels.length === 0 || !!hotelsError;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: tokens.dashboard.heading }}>
          {t('manager.occupancy.title')}
        </Typography>
        <Typography variant="body1" sx={{ color: tokens.dashboard.mutedText, mt: 0.5 }}>
          {t('manager.occupancy.subtitle')}
        </Typography>
      </Box>

      {hotelsError ? (
        <Alert
          severity="error"
          action={<Button onClick={() => window.location.reload()}>{t('common.tryAgain')}</Button>}
        >
          {hotelsError}
        </Alert>
      ) : null}

      <Card
        sx={{ borderRadius: 3, border: `1px solid ${tokens.border.subtle}`, boxShadow: 'none' }}
      >
        <CardContent>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth disabled={filtersDisabled}>
                <InputLabel id="occupancy-property-label">
                  {t('manager.occupancy.filters.property')}
                </InputLabel>
                <Select
                  id="occupancy-property-select"
                  labelId="occupancy-property-label"
                  label={t('manager.occupancy.filters.property')}
                  name="property_id"
                  value={propertyId || ''}
                  onChange={(e) => {
                    setPropertyId(String(e.target.value));
                    setRoomTypeId('');
                    setSelectedDate(null);
                  }}
                >
                  {showHotelsSkeleton ? (
                    <MenuItem value="" disabled>
                      {t('manager.occupancy.states.loadingHotels')}
                    </MenuItem>
                  ) : (
                    hotels.map((h) => (
                      <MenuItem key={h.id} value={h.id}>
                        {h.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth disabled={filtersDisabled || !propertyId || roomTypesLoading}>
                <InputLabel id="occupancy-room-type-label">
                  {t('manager.occupancy.filters.roomType')}
                </InputLabel>
                <Select
                  id="occupancy-room-type-select"
                  labelId="occupancy-room-type-label"
                  label={t('manager.occupancy.filters.roomType')}
                  name="room_type_id"
                  value={roomTypeId}
                  onChange={(e) => {
                    setRoomTypeId(String(e.target.value));
                    setSelectedDate(null);
                  }}
                >
                  <MenuItem value="">{t('manager.occupancy.filters.roomTypeAll')}</MenuItem>
                  {roomTypeOptions.map((rt) => (
                    <MenuItem key={rt.id} value={rt.id}>
                      {rt.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth disabled={filtersDisabled}>
                <InputLabel shrink htmlFor="occupancy-month-input" id="occupancy-month-label">
                  {t('manager.occupancy.filters.month')}
                </InputLabel>
                <Box
                  component="input"
                  id="occupancy-month-input"
                  name="month"
                  type="month"
                  value={monthValue}
                  onChange={(e) => {
                    setMonthValue(e.target.value);
                    setSelectedDate(null);
                  }}
                  aria-labelledby="occupancy-month-label"
                  sx={{
                    width: '100%',
                    mt: 2,
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 1,
                    border: `1px solid ${tokens.border.subtle}`,
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                  }}
                />
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card
        sx={{ borderRadius: 3, border: `1px solid ${tokens.border.subtle}`, boxShadow: 'none' }}
      >
        <CardContent>
          {calendarError ? (
            <Alert
              severity="error"
              action={
                <Button
                  onClick={() => {
                    void loadCalendar();
                  }}
                >
                  {t('common.tryAgain')}
                </Button>
              }
            >
              {calendarError}
            </Alert>
          ) : null}

          {calendarLoading ? (
            <Skeleton variant="rounded" height={420} sx={{ mt: calendarError ? 2 : 0 }} />
          ) : (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: 0.5,
                  mb: 1,
                }}
                data-testid="occupancy-calendar-weekdays"
              >
                {WEEKDAY_KEYS.map((k) => (
                  <Typography
                    key={k}
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: tokens.dashboard.mutedText,
                      textAlign: 'center',
                      py: 0.75,
                      bgcolor: tokens.surface.muted,
                      borderRadius: 1,
                    }}
                  >
                    {t(`manager.occupancy.weekdays.${k}`)}
                  </Typography>
                ))}
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: 0.75,
                }}
                data-testid="occupancy-calendar-grid"
              >
                {parsedMonth &&
                  gridCells.map((cell, idx) => {
                    if (cell === null) {
                      return (
                        <Box
                          key={`empty-${idx}`}
                          sx={{
                            minHeight: 96,
                            bgcolor: tokens.surface.muted,
                            borderRadius: 1,
                          }}
                        />
                      );
                    }
                    const iso = isoDay(parsedMonth.year, parsedMonth.monthIndex, cell);
                    const dayData = dayByIso.get(iso);
                    const selected = selectedDate === iso;
                    const level = dayData?.occupancy_level ?? 'LOW';
                    const ls = levelStyle(level);

                    return (
                      <Box
                        key={iso}
                        component="button"
                        type="button"
                        onClick={() =>
                          handlePickDay(parsedMonth.year, parsedMonth.monthIndex, cell)
                        }
                        data-testid={`occupancy-day-${iso}`}
                        data-occupancy-level={dayData ? level : ''}
                        sx={{
                          position: 'relative',
                          minHeight: 96,
                          textAlign: 'left',
                          p: 1,
                          borderRadius: 1,
                          border: selected
                            ? `2px solid ${tokens.brand.primary}`
                            : `1px solid ${tokens.border.subtle}`,
                          bgcolor: dayData ? ls.cellBg : tokens.surface.muted,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          '&:hover': { filter: 'brightness(0.98)' },
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 700, color: tokens.text.primary }}
                        >
                          {cell}
                        </Typography>
                        {dayData ? (
                          <>
                            <Typography
                              variant="caption"
                              sx={{
                                color: tokens.text.primary,
                                fontWeight: 600,
                                fontSize: '0.68rem',
                              }}
                            >
                              {t('manager.occupancy.calendar.roomsLine', {
                                occupied: dayData.occupied_rooms,
                                total: dayData.total_rooms,
                              })}
                            </Typography>
                            <Box sx={{ alignSelf: 'flex-end' }}>
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{
                                  display: 'inline-block',
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: 10,
                                  fontWeight: 800,
                                  fontSize: '0.7rem',
                                  bgcolor: ls.badgeBg,
                                  color: ls.badgeFg,
                                }}
                              >
                                {`${Math.round(dayData.occupancy_rate)}%`}
                              </Typography>
                            </Box>
                          </>
                        ) : (
                          <Typography variant="caption" sx={{ color: tokens.text.muted }}>
                            —
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
              </Box>

              {!calendarError && !calendarLoading && calendarDays.length === 0 && propertyId ? (
                <Typography sx={{ mt: 2, color: tokens.dashboard.mutedText }}>
                  {t('manager.occupancy.states.calendarEmpty')}
                </Typography>
              ) : null}
            </>
          )}

          <Stack
            direction="row"
            spacing={2}
            flexWrap="wrap"
            sx={{ mt: 2 }}
            data-testid="occupancy-legend"
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: 0.5,
                  bgcolor: tokens.state.successFg,
                  border: `1px solid ${tokens.state.successBorder}`,
                }}
              />
              <Typography variant="caption" sx={{ color: tokens.text.primary }}>
                {t('manager.occupancy.legend.high')}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: 0.5,
                  bgcolor: tokens.brand.accentOrangeContained,
                  border: `1px solid ${tokens.state.warningBorder}`,
                }}
              />
              <Typography variant="caption" sx={{ color: tokens.text.primary }}>
                {t('manager.occupancy.legend.medium')}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: 0.5,
                  bgcolor: tokens.state.errorFg,
                  border: `1px solid ${tokens.border.subtle}`,
                }}
              />
              <Typography variant="caption" sx={{ color: tokens.text.primary }}>
                {t('manager.occupancy.legend.low')}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card
        sx={{ borderRadius: 3, border: `1px solid ${tokens.border.subtle}`, boxShadow: 'none' }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {t('manager.occupancy.breakdown.title')}
          </Typography>
          {!selectedDate ? (
            <Typography variant="body2" sx={{ color: tokens.dashboard.mutedText }}>
              {t('manager.occupancy.breakdown.hint')}
            </Typography>
          ) : breakdownLoading ? (
            <Skeleton variant="rounded" height={120} />
          ) : breakdownError ? (
            <Alert severity="error">{breakdownError}</Alert>
          ) : breakdown?.room_types?.length ? (
            <Table size="small" data-testid="occupancy-breakdown-table">
              <TableHead>
                <TableRow>
                  <TableCell>{t('manager.occupancy.breakdown.columns.roomType')}</TableCell>
                  <TableCell align="right">
                    {t('manager.occupancy.breakdown.columns.occupied')}
                  </TableCell>
                  <TableCell align="right">
                    {t('manager.occupancy.breakdown.columns.available')}
                  </TableCell>
                  <TableCell align="right">
                    {t('manager.occupancy.breakdown.columns.blocked')}
                  </TableCell>
                  <TableCell align="right">
                    {t('manager.occupancy.breakdown.columns.rate')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {breakdown.room_types.map((row) => (
                  <TableRow key={row.room_type_id}>
                    <TableCell>{row.room_type_name}</TableCell>
                    <TableCell align="right">{row.occupied_rooms}</TableCell>
                    <TableCell align="right">{row.available_rooms}</TableCell>
                    <TableCell align="right">{row.blocked_rooms}</TableCell>
                    <TableCell align="right">{`${Math.round(row.occupancy_rate)}%`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" sx={{ color: tokens.dashboard.mutedText }}>
              {t('manager.occupancy.breakdown.empty')}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card
        sx={{ borderRadius: 3, border: `1px solid ${tokens.border.subtle}`, boxShadow: 'none' }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {t('manager.occupancy.projection.title')}
          </Typography>
          <OccupancyProjectionAlerts
            key={`${propertyId || 'none'}-${projectionListNonce}`}
            periods={projectionAlerts}
            days={projectionDayAlerts}
            loading={projectionLoading}
            errorMessage={projectionError}
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
