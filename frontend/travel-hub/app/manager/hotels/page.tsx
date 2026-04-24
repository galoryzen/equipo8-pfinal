'use client';

import { useEffect, useId, useMemo, useState } from 'react';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import { type ManagerHotelItem, getManagerHotels } from '@/app/lib/api/manager';
import { tokens } from '@/lib/theme/tokens';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import HotelDetailView from './[id]/HotelDetailView';

// ─── Sub-components ─────────────────────────────────────────────────────────

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

function OccupancyBar({
  occupied,
  total,
  hotelName,
}: {
  occupied: number;
  total: number;
  hotelName: string;
}) {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const label = t('manager.hotels.rooms_other', { count: total });

  return (
    <Box sx={{ minWidth: 140 }}>
      <Typography
        sx={{ fontSize: '0.9375rem', fontWeight: 700, color: tokens.text.primary, mb: 0.75 }}
      >
        {label}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        aria-label={`${hotelName} — ${pct}% occupied`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        sx={{
          height: 8,
          borderRadius: 999,
          bgcolor: tokens.border.subtle,
          '& .MuiLinearProgress-bar': {
            bgcolor: tokens.brand.accentOrange,
            borderRadius: 999,
          },
        }}
      />
    </Box>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ManagerHotelsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hotelSearchId = useId();

  const selectedHotelId = searchParams.get('id');

  const [hotels, setHotels] = useState<ManagerHotelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hotelSearch, setHotelSearch] = useState('');

  useEffect(() => {
    if (selectedHotelId) return; // skip fetch when showing detail view
    let cancelled = false;
    getManagerHotels()
      .then((data) => {
        if (!cancelled) {
          setHotels(data.items);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load hotels');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedHotelId]);

  const filteredHotels = useMemo(
    () =>
      hotels.filter(
        (h) =>
          h.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
          h.location.toLowerCase().includes(hotelSearch.toLowerCase())
      ),
    [hotels, hotelSearch]
  );

  const TABLE_HEAD_SX = {
    fontSize: '0.75rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: tokens.text.secondary,
  };

  // Render the detail view when a hotel query param is present (after all hooks)
  if (selectedHotelId) {
    return <HotelDetailView hotelId={selectedHotelId} />;
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
        {/* ── Page header ── */}
        <Box component="header" sx={{ mb: 3.5 }}>
          <Typography
            component="h1"
            sx={{
              fontSize: '2.25rem',
              lineHeight: 1.1,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: tokens.text.primary,
            }}
          >
            {t('manager.hotels.title')}
          </Typography>
          <Typography
            component="p"
            sx={{ mt: 0.5, fontSize: '1rem', fontWeight: 500, color: tokens.text.secondary }}
          >
            {t('manager.hotels.subtitle')}
          </Typography>
        </Box>

        {/* ── Search + filter bar ── */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
          <OutlinedInput
            id={hotelSearchId}
            value={hotelSearch}
            onChange={(e) => setHotelSearch(e.target.value)}
            placeholder={t('manager.hotels.searchPlaceholder')}
            inputProps={{ 'aria-label': t('manager.hotels.searchPlaceholder') }}
            startAdornment={
              <InputAdornment position="start">
                <SearchIcon aria-hidden="true" sx={{ color: tokens.text.muted, fontSize: 22 }} />
              </InputAdornment>
            }
            sx={{
              flex: 1,
              bgcolor: tokens.surface.paper,
              borderRadius: 2,
              fontSize: '1rem',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.border.default },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: tokens.border.subtleHover,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: tokens.brand.accentOrange,
              },
              '& input': { py: 1.5 },
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterListIcon aria-hidden="true" />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9375rem',
              borderColor: tokens.border.default,
              color: tokens.text.secondary,
              bgcolor: tokens.surface.paper,
              borderRadius: 2,
              px: 2.5,
              '&:hover': {
                borderColor: tokens.border.subtleHover,
                bgcolor: tokens.surface.subtle,
              },
              '&:focus-visible': {
                outline: `2px solid ${tokens.brand.accentOrange}`,
                outlineOffset: 2,
              },
            }}
          >
            {t('manager.hotels.filters')}
          </Button>
        </Box>

        {/* ── Hotels table ── */}
        <Box
          role="table"
          aria-label={t('manager.hotels.title')}
          sx={{
            bgcolor: tokens.surface.paper,
            borderRadius: 3,
            border: '1px solid',
            borderColor: tokens.border.subtle,
            overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <Box
            role="rowgroup"
            sx={{
              display: 'grid',
              gridTemplateColumns: '2.5fr 1.5fr 1.6fr 1.3fr 1.3fr',
              px: 3.5,
              py: 2,
              bgcolor: tokens.surface.muted,
              borderBottom: '1px solid',
              borderColor: tokens.border.subtle,
            }}
          >
            {[
              { key: 'hotelDetails', align: 'left' },
              { key: 'location', align: 'left' },
              { key: 'inventory', align: 'left' },
              { key: 'status', align: 'left' },
              { key: 'actions', align: 'right' },
            ].map(({ key, align }) => (
              <Typography
                key={key}
                role="columnheader"
                aria-sort="none"
                sx={{ ...TABLE_HEAD_SX, textAlign: align as 'left' | 'right' }}
              >
                {t(`manager.hotels.tableHeaders.${key}`)}
              </Typography>
            ))}
          </Box>

          {/* Body */}
          <Box role="rowgroup">
            {loading ? (
              <Box role="row" sx={{ px: 3.5, py: 5, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={32} sx={{ color: tokens.brand.accentOrange }} />
              </Box>
            ) : error ? (
              <Box role="row" sx={{ px: 3.5, py: 5, textAlign: 'center' }}>
                <Typography
                  role="cell"
                  sx={{ fontSize: '1rem', color: tokens.state.warningFg, fontWeight: 500 }}
                >
                  {error}
                </Typography>
              </Box>
            ) : filteredHotels.length === 0 ? (
              <Box role="row" sx={{ px: 3.5, py: 5, textAlign: 'center' }}>
                <Typography
                  role="cell"
                  sx={{ fontSize: '1rem', color: tokens.text.secondary, fontWeight: 500 }}
                >
                  {t('manager.hotels.noResults')}
                </Typography>
              </Box>
            ) : (
              filteredHotels.map((hotel, idx) => (
                <Box key={hotel.id} role="row">
                  {idx > 0 && <Divider sx={{ borderColor: tokens.border.subtle }} />}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '2.5fr 1.5fr 1.6fr 1.3fr 1.3fr',
                      alignItems: 'center',
                      px: 3.5,
                      py: 2.5,
                      transition: 'background 0.15s',
                      '&:hover': { bgcolor: tokens.surface.subtle },
                    }}
                  >
                    {/* Hotel details */}
                    <Box
                      role="cell"
                      sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}
                    >
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: '1px solid',
                          borderColor: tokens.border.subtle,
                          bgcolor: tokens.surface.muted,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {hotel.imageUrl ? (
                          <Image
                            src={hotel.imageUrl}
                            alt={hotel.name}
                            width={64}
                            height={64}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : null}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            color: tokens.text.primary,
                            fontSize: '1rem',
                            lineHeight: 1.25,
                          }}
                        >
                          {hotel.name}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            color: tokens.text.secondary,
                            fontWeight: 500,
                            mt: 0.25,
                          }}
                        >
                          {t('manager.hotels.hotelIdPrefix')} {hotel.id}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Location */}
                    <Box role="cell">
                      <Typography
                        sx={{
                          fontSize: '0.9375rem',
                          color: tokens.text.secondary,
                          fontWeight: 500,
                        }}
                      >
                        {hotel.location}
                      </Typography>
                    </Box>

                    {/* Inventory */}
                    <Box role="cell">
                      <OccupancyBar
                        occupied={hotel.occupiedRooms}
                        total={hotel.totalRooms}
                        hotelName={hotel.name}
                      />
                    </Box>

                    {/* Status */}
                    <Box role="cell">
                      <HotelStatusBadge status={hotel.status} />
                    </Box>

                    {/* Actions */}
                    <Box role="cell" sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        onClick={() => router.push(`/manager/hotels?id=${hotel.id}`)}
                        aria-label={t('manager.hotels.manageRoomsFor', {
                          hotelName: hotel.name,
                        })}
                        sx={{
                          bgcolor: tokens.ink.charcoal,
                          color: tokens.surface.paper,
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          borderRadius: '10px',
                          px: 2.5,
                          py: 1.125,
                          boxShadow: 'none',
                          whiteSpace: 'nowrap',
                          '&:hover': { bgcolor: tokens.text.primary, boxShadow: 'none' },
                          '&:focus-visible': {
                            outline: `2px solid ${tokens.brand.accentOrange}`,
                            outlineOffset: 2,
                          },
                        }}
                      >
                        {t('manager.hotels.manageRooms')}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
