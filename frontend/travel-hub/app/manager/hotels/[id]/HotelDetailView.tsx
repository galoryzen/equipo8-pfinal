'use client';

import { useEffect, useId, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  type HotelStatsOut,
  type ManagerHotelItem,
  type RoomTypeManagerItem,
  getHotelMetrics,
  getHotelRoomTypes,
  getManagerHotels,
} from '@/app/lib/api/manager';
import { tokens } from '@/lib/theme/tokens';
import BedOutlinedIcon from '@mui/icons-material/BedOutlined';
import BedroomChildOutlinedIcon from '@mui/icons-material/BedroomChildOutlined';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import KingBedOutlinedIcon from '@mui/icons-material/KingBedOutlined';
import LoopOutlinedIcon from '@mui/icons-material/LoopOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import SearchIcon from '@mui/icons-material/Search';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Pagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import RoomTypeManageView from './RoomTypeManageView';

// ─── Sub-components ───────────────────────────────────────────────────────────

function HotelStatusBadge({ status }: { status: ManagerHotelItem['status'] }) {
  const { t } = useTranslation();
  const isActive = status === 'ACTIVE';

  return (
    <Box
      role="status"
      aria-label={
        isActive ? t('manager.hotels.statusActive') : t('manager.hotels.statusPendingReview')
      }
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.75,
        py: 0.625,
        borderRadius: '999px',
        border: '1px solid',
        borderColor: isActive ? tokens.state.successBorder : tokens.state.warningBorder,
        bgcolor: isActive ? tokens.state.successBg : tokens.state.warningBg,
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: isActive ? tokens.state.success : '#F59E0B',
        }}
      />
      <Typography
        sx={{
          fontSize: '0.8125rem',
          fontWeight: 700,
          color: isActive ? tokens.state.successFg : tokens.state.warningFg,
          lineHeight: 1,
        }}
      >
        {isActive ? t('manager.hotels.statusActive') : t('manager.hotels.statusPendingReview')}
      </Typography>
    </Box>
  );
}

function RoomTypeIconComponent({ icon }: { icon: string }) {
  const sx = { fontSize: 22, color: tokens.text.secondary };
  switch (icon) {
    case 'king':
      return <KingBedOutlinedIcon aria-hidden="true" sx={sx} />;
    case 'suite':
      return <BusinessCenterOutlinedIcon aria-hidden="true" sx={sx} />;
    case 'double':
      return <BedroomChildOutlinedIcon aria-hidden="true" sx={sx} />;
    case 'penthouse':
      return <StarBorderOutlinedIcon aria-hidden="true" sx={sx} />;
    default:
      return <BedOutlinedIcon aria-hidden="true" sx={sx} />;
  }
}

function HotelStatCard({
  icon,
  label,
  value,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
}) {
  return (
    <Box
      sx={{
        bgcolor: tokens.surface.paper,
        borderRadius: 3,
        border: '1px solid',
        borderColor: tokens.border.subtle,
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          width: 48,
          height: 48,
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
      <Box>
        <Typography
          sx={{ fontSize: '0.8125rem', fontWeight: 600, color: tokens.text.secondary, mb: 0.25 }}
        >
          {label}
        </Typography>
        <Typography
          sx={{ fontSize: '1.5rem', fontWeight: 900, color: tokens.text.primary, lineHeight: 1.1 }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOMS_PER_PAGE = 5;

// ─── Main export ──────────────────────────────────────────────────────────────

export default function HotelDetailView({ hotelId }: { hotelId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchId = useId();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [hotel, setHotel] = useState<ManagerHotelItem | null>(null);
  const [stats, setStats] = useState<HotelStatsOut | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomTypeManagerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [selectedRoomType, setSelectedRoomType] = useState<RoomTypeManagerItem | null>(null);
  const [roomTypeSearch, setRoomTypeSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied'>('all');
  const [page, setPage] = useState(1);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    Promise.all([getManagerHotels(1, 100), getHotelMetrics(hotelId), getHotelRoomTypes(hotelId)])
      .then(([hotelsData, metricsData, roomTypesData]) => {
        if (cancelled) return;
        const found = hotelsData.items.find((h) => h.id === hotelId) ?? null;
        setHotel(found);
        setStats(metricsData);
        setRoomTypes(roomTypesData.items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load hotel data');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  // ── Filtered + paged room types ─────────────────────────────────────────────
  const filteredRoomTypes = useMemo(() => {
    return roomTypes.filter((rt) => {
      const matchesSearch = rt.name.toLowerCase().includes(roomTypeSearch.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'available' && rt.available > 0) ||
        (statusFilter === 'occupied' && rt.available < rt.total);
      return matchesSearch && matchesStatus;
    });
  }, [roomTypes, roomTypeSearch, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRoomTypes.length / ROOMS_PER_PAGE));
  const pagedRoomTypes = filteredRoomTypes.slice(
    (page - 1) * ROOMS_PER_PAGE,
    page * ROOMS_PER_PAGE
  );

  const revenueFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(stats?.monthlyRevenue ?? 0);

  const TABLE_HEAD_SX = {
    fontSize: '0.6875rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: tokens.text.secondary,
  };

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 'calc(100vh - 6rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress sx={{ color: tokens.brand.accentOrange }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <Typography sx={{ color: tokens.state.warningFg, fontWeight: 600 }}>{error}</Typography>
        <Button
          onClick={() => router.push('/manager/hotels')}
          sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}
        >
          {t('manager.hotels.hotelDetail.breadcrumbLabel')}
        </Button>
      </Box>
    );
  }

  if (!hotel) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <Typography sx={{ color: tokens.text.secondary }}>Hotel not found.</Typography>
        <Button
          onClick={() => router.push('/manager/hotels')}
          sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}
        >
          {t('manager.hotels.hotelDetail.breadcrumbLabel')}
        </Button>
      </Box>
    );
  }

  if (selectedRoomType) {
    return (
      <RoomTypeManageView
        hotelId={hotelId}
        hotelName={hotel.name}
        roomType={selectedRoomType}
        onBack={() => setSelectedRoomType(null)}
      />
    );
  }

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 6rem)',
        borderRadius: 6,
        p: { xs: 3, md: 4 },
        backgroundColor: tokens.surface.pageWarm,
      }}
    >
      <Container maxWidth="lg" disableGutters sx={{ px: 0 }}>
        {/* ── Breadcrumb ── */}
        <Box
          component="nav"
          aria-label={t('manager.hotels.hotelDetail.breadcrumbNav')}
          sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}
        >
          <Button
            onClick={() => router.push('/manager/hotels')}
            aria-label={t('manager.hotels.hotelDetail.breadcrumbLabel')}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: tokens.text.secondary,
              p: 0,
              minWidth: 'auto',
              '&:hover': { bgcolor: 'transparent', color: tokens.text.primary },
              '&:focus-visible': {
                outline: `2px solid ${tokens.brand.accentOrange}`,
                outlineOffset: 2,
                borderRadius: 1,
              },
            }}
          >
            {t('manager.hotels.hotelDetail.breadcrumbLabel')}
          </Button>
          <NavigateNextIcon
            aria-hidden="true"
            sx={{ fontSize: 18, color: tokens.text.muted, mx: 0.25 }}
          />
          <Typography
            aria-current="page"
            sx={{ fontSize: '0.9375rem', fontWeight: 600, color: tokens.text.primary }}
          >
            {hotel.name}
          </Typography>
        </Box>

        {/* ── Hotel header ── */}
        <Box component="header" sx={{ mb: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 0.75 }}>
            <Typography
              component="h1"
              sx={{
                fontSize: '2rem',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: tokens.text.primary,
                lineHeight: 1.1,
              }}
            >
              {hotel.name}
            </Typography>
            <HotelStatusBadge status={hotel.status} />
          </Box>
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 500, color: tokens.text.secondary }}>
            {t('manager.hotels.hotelDetail.idLabel')} {hotel.id}
            {' | '}
            {t('manager.hotels.hotelDetail.locationLabel')} {hotel.location}
          </Typography>
        </Box>

        {/* ── Stat cards ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2.5,
            mb: 4,
          }}
        >
          <HotelStatCard
            icon={<LoopOutlinedIcon aria-hidden="true" sx={{ fontSize: 24, color: '#1D4ED8' }} />}
            label={t('manager.hotels.hotelDetail.stats.occupancyRate')}
            value={`${stats?.occupancyRate ?? 0}%`}
            iconBg="#EFF6FF"
          />
          <HotelStatCard
            icon={
              <ConfirmationNumberOutlinedIcon
                aria-hidden="true"
                sx={{ fontSize: 24, color: '#C2410C' }}
              />
            }
            label={t('manager.hotels.hotelDetail.stats.activeBookings')}
            value={String(stats?.activeBookings ?? 0)}
            iconBg={tokens.state.warningBg}
          />
          <HotelStatCard
            icon={
              <SavingsOutlinedIcon
                aria-hidden="true"
                sx={{ fontSize: 24, color: tokens.state.successFg }}
              />
            }
            label={t('manager.hotels.hotelDetail.stats.revenue')}
            value={revenueFormatted}
            iconBg={tokens.state.successBg}
          />
        </Box>

        {/* ── Room Management table ── */}
        <Box
          component="section"
          aria-labelledby="room-mgmt-heading"
          sx={{
            bgcolor: tokens.surface.paper,
            borderRadius: 3,
            border: '1px solid',
            borderColor: tokens.border.subtle,
            overflow: 'hidden',
          }}
        >
          {/* Section header */}
          <Box
            sx={{
              px: 3,
              py: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              borderBottom: '1px solid',
              borderColor: tokens.border.subtle,
            }}
          >
            <Typography
              id="room-mgmt-heading"
              component="h2"
              sx={{ fontSize: '1.125rem', fontWeight: 800, color: tokens.text.primary }}
            >
              {t('manager.hotels.hotelDetail.roomManagement.sectionTitle')}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <OutlinedInput
                id={searchId}
                value={roomTypeSearch}
                onChange={(e) => {
                  setRoomTypeSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t('manager.hotels.hotelDetail.roomManagement.searchPlaceholder')}
                inputProps={{
                  'aria-label': t('manager.hotels.hotelDetail.roomManagement.searchPlaceholder'),
                }}
                startAdornment={
                  <InputAdornment position="start">
                    <SearchIcon
                      aria-hidden="true"
                      sx={{ color: tokens.text.muted, fontSize: 20 }}
                    />
                  </InputAdornment>
                }
                sx={{
                  width: 240,
                  bgcolor: tokens.surface.pageCool,
                  borderRadius: 2,
                  fontSize: '0.9375rem',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.border.default },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: tokens.border.subtleHover,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: tokens.brand.accentOrange,
                  },
                  '& input': { py: 1.125 },
                }}
              />

              <FormControl size="small">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as typeof statusFilter);
                    setPage(1);
                  }}
                  aria-label={t('manager.hotels.hotelDetail.roomManagement.statusFilterLabel')}
                  displayEmpty
                  sx={{
                    borderRadius: 2,
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    bgcolor: tokens.surface.pageCool,
                    color: tokens.text.secondary,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.border.default },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: tokens.border.subtleHover,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: tokens.brand.accentOrange,
                    },
                    '& .MuiSelect-select': { py: 1.125, pr: 4 },
                  }}
                >
                  <MenuItem value="all">
                    {t('manager.hotels.hotelDetail.roomManagement.allStatuses')}
                  </MenuItem>
                  <MenuItem value="available">
                    {t('manager.hotels.hotelDetail.roomManagement.statusAvailable')}
                  </MenuItem>
                  <MenuItem value="occupied">
                    {t('manager.hotels.hotelDetail.roomManagement.statusOccupied')}
                  </MenuItem>
                </Select>
              </FormControl>

              <IconButton
                aria-label={t('manager.hotels.filters')}
                sx={{
                  border: '1px solid',
                  borderColor: tokens.border.default,
                  borderRadius: 2,
                  bgcolor: tokens.surface.pageCool,
                  color: tokens.text.secondary,
                  p: 1.125,
                  '&:hover': {
                    bgcolor: tokens.surface.subtle,
                    borderColor: tokens.border.subtleHover,
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${tokens.brand.accentOrange}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <FilterListIcon aria-hidden="true" sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>
          </Box>

          {/* Table */}
          <Box
            role="table"
            aria-label={t('manager.hotels.hotelDetail.roomManagement.sectionTitle')}
          >
            {/* Header */}
            <Box
              role="rowgroup"
              sx={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr',
                px: 3,
                py: 1.75,
                bgcolor: tokens.surface.muted,
                borderBottom: '1px solid',
                borderColor: tokens.border.subtle,
              }}
            >
              {(
                [
                  { key: 'tableRoomType', align: 'left' },
                  { key: 'tableAvailable', align: 'left' },
                  { key: 'tableAction', align: 'right' },
                ] as const
              ).map(({ key, align }) => (
                <Typography
                  key={key}
                  role="columnheader"
                  aria-sort="none"
                  sx={{ ...TABLE_HEAD_SX, textAlign: align }}
                >
                  {t(`manager.hotels.hotelDetail.roomManagement.${key}`)}
                </Typography>
              ))}
            </Box>

            {/* Rows */}
            <Box role="rowgroup" aria-live="polite">
              {pagedRoomTypes.length === 0 ? (
                <Box role="row" sx={{ px: 3, py: 5, textAlign: 'center' }}>
                  <Typography
                    role="cell"
                    sx={{ fontSize: '1rem', color: tokens.text.secondary, fontWeight: 500 }}
                  >
                    {t('manager.hotels.roomManagement.noResults')}
                  </Typography>
                </Box>
              ) : (
                pagedRoomTypes.map((rt, idx) => (
                  <Box key={rt.id} role="row">
                    {idx > 0 && <Divider sx={{ borderColor: tokens.border.subtle }} />}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 2fr 1fr',
                        alignItems: 'center',
                        px: 3,
                        py: 2,
                        transition: 'background 0.15s',
                        '&:hover': { bgcolor: tokens.surface.subtle },
                      }}
                    >
                      {/* Room type */}
                      <Box role="cell" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          aria-hidden="true"
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            bgcolor: tokens.surface.pageCool,
                            border: '1px solid',
                            borderColor: tokens.border.subtle,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <RoomTypeIconComponent icon={rt.icon} />
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.9375rem',
                            fontWeight: 700,
                            color: tokens.text.primary,
                          }}
                        >
                          {rt.name}
                        </Typography>
                      </Box>

                      {/* Available count */}
                      <Box role="cell">
                        <Typography
                          sx={{
                            fontSize: '0.9375rem',
                            fontWeight: 700,
                            color: tokens.state.successFg,
                          }}
                        >
                          {t('manager.hotels.hotelDetail.roomManagement.availableCount', {
                            available: rt.available,
                            total: rt.total,
                          })}
                        </Typography>
                      </Box>

                      {/* Manage button */}
                      <Box role="cell" sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          onClick={() => setSelectedRoomType(rt)}
                          aria-label={t(
                            'manager.hotels.hotelDetail.roomManagement.manageRoomType',
                            { name: rt.name }
                          )}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color: tokens.brand.accentOrangeFg,
                            bgcolor: tokens.brand.accentOrangeSoft,
                            borderRadius: '8px',
                            px: 2,
                            py: 0.75,
                            minWidth: 'auto',
                            '&:hover': { bgcolor: `${tokens.brand.accentOrange}26` },
                            '&:focus-visible': {
                              outline: `2px solid ${tokens.brand.accentOrange}`,
                              outlineOffset: 2,
                            },
                          }}
                        >
                          {t('manager.hotels.hotelDetail.roomManagement.manage')}
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Box>

          {/* Pagination footer */}
          <Box
            sx={{
              px: 3,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
              borderTop: '1px solid',
              borderColor: tokens.border.subtle,
            }}
          >
            <Typography
              sx={{ fontSize: '0.875rem', fontWeight: 500, color: tokens.text.secondary }}
            >
              {t('manager.hotels.hotelDetail.roomManagement.showing', {
                count: filteredRoomTypes.length,
              })}
            </Typography>
            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                size="small"
                aria-label={t('manager.hotels.hotelDetail.roomManagement.paginationLabel')}
                sx={{
                  '& .MuiPaginationItem-root': {
                    borderRadius: '50%',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: tokens.text.secondary,
                    '&.Mui-selected': {
                      bgcolor: tokens.brand.accentOrange,
                      color: '#fff',
                      '&:hover': { bgcolor: tokens.brand.accentOrangeFg },
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${tokens.brand.accentOrange}`,
                      outlineOffset: 2,
                    },
                  },
                }}
              />
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
