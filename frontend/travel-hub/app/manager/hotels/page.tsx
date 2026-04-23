'use client';

import { useId, useMemo, useState } from 'react';

import Image from 'next/image';

import { tokens } from '@/lib/theme/tokens';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BedOutlinedIcon from '@mui/icons-material/BedOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Hotel {
  id: string;
  name: string;
  location: string;
  totalRooms: number;
  occupiedRooms: number;
  status: 'ACTIVE' | 'PENDING_REVIEW';
  imageUrl: string;
  categories: number;
}

interface Room {
  id: string;
  number: string;
  type: string;
  status: 'AVAILABLE' | 'OCCUPIED';
  imageUrl: string;
}

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_HOTELS: Hotel[] = [
  {
    id: 'HOTEL-001',
    name: 'Grand Plaza Resort',
    location: 'London, United Kingdom',
    totalRooms: 120,
    occupiedRooms: 36,
    status: 'ACTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=80&h=80&fit=crop',
    categories: 5,
  },
  {
    id: 'HOTEL-002',
    name: 'Blue Bay Inn',
    location: 'Nice, France',
    totalRooms: 45,
    occupiedRooms: 9,
    status: 'PENDING_REVIEW',
    imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=80&h=80&fit=crop',
    categories: 3,
  },
  {
    id: 'HOTEL-003',
    name: 'Urban Stay',
    location: 'New York, USA',
    totalRooms: 85,
    occupiedRooms: 34,
    status: 'ACTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=80&h=80&fit=crop',
    categories: 4,
  },
];

const MOCK_ROOMS: Record<string, Room[]> = {
  'HOTEL-001': [
    {
      id: 'r1',
      number: '401',
      type: 'DELUXE KING',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=280&fit=crop',
    },
    {
      id: 'r2',
      number: '402',
      type: 'SUITE',
      status: 'OCCUPIED',
      imageUrl: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=400&h=280&fit=crop',
    },
    {
      id: 'r3',
      number: '403',
      type: 'DELUXE TWIN',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=280&fit=crop',
    },
    {
      id: 'r4',
      number: '404',
      type: 'SUITE',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=400&h=280&fit=crop',
    },
    {
      id: 'r5',
      number: '405',
      type: 'DELUXE KING',
      status: 'OCCUPIED',
      imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=280&fit=crop',
    },
  ],
  'HOTEL-002': [
    {
      id: 'r6',
      number: '101',
      type: 'STANDARD',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=280&fit=crop',
    },
    {
      id: 'r7',
      number: '102',
      type: 'SUITE',
      status: 'OCCUPIED',
      imageUrl: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=400&h=280&fit=crop',
    },
    {
      id: 'r8',
      number: '103',
      type: 'DELUXE KING',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=280&fit=crop',
    },
  ],
  'HOTEL-003': [
    {
      id: 'r9',
      number: '201',
      type: 'DELUXE KING',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=280&fit=crop',
    },
    {
      id: 'r10',
      number: '202',
      type: 'DELUXE TWIN',
      status: 'OCCUPIED',
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=280&fit=crop',
    },
    {
      id: 'r11',
      number: '203',
      type: 'SUITE',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=400&h=280&fit=crop',
    },
    {
      id: 'r12',
      number: '204',
      type: 'STANDARD',
      status: 'AVAILABLE',
      imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=280&fit=crop',
    },
  ],
};

// ─── Filter config ──────────────────────────────────────────────────────────

type RoomFilterKey = 'all' | 'suites' | 'deluxe';

const ROOM_FILTERS: { key: RoomFilterKey; tKey: string }[] = [
  { key: 'all', tKey: 'manager.hotels.roomManagement.filterAllTypes' },
  { key: 'suites', tKey: 'manager.hotels.roomManagement.filterSuites' },
  { key: 'deluxe', tKey: 'manager.hotels.roomManagement.filterDeluxe' },
];

function matchesRoomFilter(roomType: string, filter: RoomFilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'suites') return roomType.toUpperCase() === 'SUITE';
  if (filter === 'deluxe') return roomType.toUpperCase().includes('DELUXE');
  return true;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function HotelStatusBadge({ status }: { status: Hotel['status'] }) {
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

function RoomCard({ room, onManage }: { room: Room; onManage: (id: string) => void }) {
  const { t } = useTranslation();
  const isAvailable = room.status === 'AVAILABLE';

  return (
    <Box
      component="article"
      aria-label={`${t('manager.hotels.roomManagement.manageRoom', { number: room.number })} — ${room.type}`}
      sx={{
        bgcolor: tokens.surface.paper,
        borderRadius: 3,
        border: '1px solid',
        borderColor: tokens.border.subtle,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
      }}
    >
      {/* Room number + type badge */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          pt: 2,
          pb: 1,
        }}
      >
        <Typography
          component="h3"
          sx={{ fontSize: '1.5rem', fontWeight: 900, color: tokens.text.primary, lineHeight: 1 }}
        >
          {room.number}
        </Typography>
        <Box
          sx={{
            px: 1.25,
            py: 0.375,
            borderRadius: 1,
            bgcolor: tokens.surface.pageCool,
            border: '1px solid',
            borderColor: tokens.border.subtle,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              letterSpacing: '0.07em',
              color: tokens.text.secondary,
              textTransform: 'uppercase',
            }}
          >
            {room.type}
          </Typography>
        </Box>
      </Box>

      {/* Room photo */}
      <Image
        src={room.imageUrl}
        alt=""
        aria-hidden="true"
        width={400}
        height={200}
        style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }}
      />

      {/* Footer: status + action */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
          {isAvailable ? (
            <CheckCircleOutlineIcon
              aria-hidden="true"
              sx={{ fontSize: 17, color: tokens.state.success }}
            />
          ) : (
            <BedOutlinedIcon
              aria-hidden="true"
              sx={{ fontSize: 17, color: tokens.text.secondary }}
            />
          )}
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: isAvailable ? tokens.state.success : tokens.text.secondary,
            }}
          >
            {isAvailable
              ? t('manager.hotels.roomManagement.statusAvailable')
              : t('manager.hotels.roomManagement.statusOccupied')}
          </Typography>
        </Box>

        <Button
          size="small"
          onClick={() => onManage(room.id)}
          aria-label={t('manager.hotels.roomManagement.manageRoom', { number: room.number })}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: tokens.brand.accentOrange,
            minWidth: 'auto',
            p: 0,
            lineHeight: 1,
            '&:hover': { bgcolor: 'transparent', color: tokens.brand.accentOrangeFg },
            '&:focus-visible': {
              outline: `2px solid ${tokens.brand.accentOrange}`,
              outlineOffset: 2,
              borderRadius: 1,
            },
          }}
        >
          {t('manager.hotels.roomManagement.manageRoom', { number: '' }).trim()}
        </Button>
      </Box>
    </Box>
  );
}

function AddRoomCard({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-label={label}
      sx={{
        bgcolor: tokens.surface.paper,
        borderRadius: 3,
        border: '2px dashed',
        borderColor: tokens.border.subtleHover,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.25,
        minHeight: 240,
        cursor: 'pointer',
        width: '100%',
        transition: 'border-color 0.15s, background 0.15s',
        '&:hover': {
          borderColor: tokens.brand.accentOrange,
          bgcolor: tokens.brand.accentOrangeSoft,
        },
        '&:focus-visible': {
          outline: `2px solid ${tokens.brand.accentOrange}`,
          outlineOffset: 2,
        },
      }}
    >
      <AddCircleOutlineIcon aria-hidden="true" sx={{ fontSize: 40, color: tokens.text.muted }} />
      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: tokens.text.secondary }}>
        {label}
      </Typography>
    </Box>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ManagerHotelsPage() {
  const { t } = useTranslation();

  const hotelSearchId = useId();
  const roomSearchId = useId();
  const roomGridId = useId();

  const [hotelSearch, setHotelSearch] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [roomSearch, setRoomSearch] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomFilterKey>('all');

  const filteredHotels = useMemo(
    () =>
      MOCK_HOTELS.filter(
        (h) =>
          h.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
          h.location.toLowerCase().includes(hotelSearch.toLowerCase())
      ),
    [hotelSearch]
  );

  const selectedHotel = MOCK_HOTELS.find((h) => h.id === selectedHotelId) ?? null;

  const filteredRooms = useMemo(() => {
    if (!selectedHotelId) return [];
    const rooms = MOCK_ROOMS[selectedHotelId] ?? [];
    return rooms.filter(
      (r) =>
        matchesRoomFilter(r.type, roomTypeFilter) &&
        (r.number.includes(roomSearch) || r.type.toLowerCase().includes(roomSearch.toLowerCase()))
    );
  }, [selectedHotelId, roomSearch, roomTypeFilter]);

  function handleManageRooms(hotelId: string) {
    setSelectedHotelId(hotelId);
    setRoomSearch('');
    setRoomTypeFilter('all');
  }

  function handleBack() {
    setSelectedHotelId(null);
    setRoomSearch('');
    setRoomTypeFilter('all');
  }

  const TABLE_HEAD_SX = {
    fontSize: '0.75rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: tokens.text.secondary,
  };

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

        {/* ── Hotel search + filters ── */}
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
            mb: 5,
          }}
        >
          {/* Table header row */}
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

          {/* Table body */}
          <Box role="rowgroup">
            {filteredHotels.length === 0 ? (
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
                    {/* Hotel details cell */}
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
                        }}
                      >
                        <Image
                          src={hotel.imageUrl}
                          alt={hotel.name}
                          width={64}
                          height={64}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
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

                    {/* Location cell */}
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

                    {/* Inventory cell */}
                    <Box role="cell">
                      <OccupancyBar
                        occupied={hotel.occupiedRooms}
                        total={hotel.totalRooms}
                        hotelName={hotel.name}
                      />
                    </Box>

                    {/* Status cell */}
                    <Box role="cell">
                      <HotelStatusBadge status={hotel.status} />
                    </Box>

                    {/* Actions cell */}
                    <Box role="cell" sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        onClick={() => handleManageRooms(hotel.id)}
                        aria-label={t('manager.hotels.manageRoomsFor', { hotelName: hotel.name })}
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

        {/* ── Room Management section ── */}
        {selectedHotel && (
          <Box component="section" aria-labelledby="room-mgmt-heading">
            <Divider sx={{ borderColor: tokens.border.subtle, mb: 3.5 }} />

            {/* Section header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
              <IconButton
                onClick={handleBack}
                aria-label={t('manager.hotels.backToHotels')}
                sx={{
                  mt: 0.375,
                  border: '1px solid',
                  borderColor: tokens.border.subtle,
                  bgcolor: tokens.surface.paper,
                  '&:hover': { bgcolor: tokens.surface.subtle },
                  '&:focus-visible': {
                    outline: `2px solid ${tokens.brand.accentOrange}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <ArrowBackIcon
                  aria-hidden="true"
                  sx={{ fontSize: 20, color: tokens.text.secondary }}
                />
              </IconButton>
              <Box>
                <Typography
                  id="room-mgmt-heading"
                  component="h2"
                  sx={{
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    letterSpacing: '-0.015em',
                    color: tokens.text.primary,
                    lineHeight: 1.15,
                  }}
                >
                  {t('manager.hotels.roomManagement.title', { hotelName: selectedHotel.name })}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.9375rem',
                    color: tokens.text.secondary,
                    fontWeight: 500,
                    mt: 0.375,
                  }}
                >
                  {t('manager.hotels.roomManagement.subtitle', {
                    totalRooms: selectedHotel.totalRooms,
                    categories: selectedHotel.categories,
                  })}
                </Typography>
              </Box>
            </Box>

            {/* Room search + type filters */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3.5, flexWrap: 'wrap' }}>
              <OutlinedInput
                id={roomSearchId}
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder={t('manager.hotels.roomManagement.searchPlaceholder')}
                inputProps={{
                  'aria-label': t('manager.hotels.roomManagement.searchPlaceholder'),
                  'aria-controls': roomGridId,
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
                  flex: 1,
                  minWidth: 260,
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
                  '& input': { py: 1.375 },
                }}
              />

              <Stack
                direction="row"
                spacing={1}
                role="group"
                aria-label={t('manager.hotels.filters')}
              >
                {ROOM_FILTERS.map(({ key, tKey }) => {
                  const isSelected = roomTypeFilter === key;
                  return (
                    <Chip
                      key={key}
                      label={t(tKey)}
                      onClick={() => setRoomTypeFilter(key)}
                      aria-pressed={isSelected}
                      role="button"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        height: 38,
                        borderRadius: 2,
                        border: '1px solid',
                        cursor: 'pointer',
                        bgcolor: isSelected ? tokens.brand.accentOrangeSoft : tokens.surface.paper,
                        borderColor: isSelected ? tokens.brand.accentOrange : tokens.border.default,
                        color: isSelected ? tokens.brand.accentOrangeFg : tokens.text.secondary,
                        '&:hover': {
                          bgcolor: isSelected
                            ? tokens.brand.accentOrangeSoft
                            : tokens.surface.subtle,
                        },
                        '&:focus-visible': {
                          outline: `2px solid ${tokens.brand.accentOrange}`,
                          outlineOffset: 2,
                        },
                        '& .MuiChip-label': { px: 2 },
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>

            {/* Room grid */}
            <Box
              id={roomGridId}
              aria-live="polite"
              aria-label={t('manager.hotels.roomManagement.title', {
                hotelName: selectedHotel.name,
              })}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 2.5,
              }}
            >
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onManage={(id) => {
                    console.log('Manage room', id);
                  }}
                />
              ))}

              <AddRoomCard
                label={t('manager.hotels.roomManagement.addNewRoom')}
                onClick={() => {
                  console.log('Add new room to', selectedHotelId);
                }}
              />
            </Box>

            {/* Empty state */}
            {filteredRooms.length === 0 && (
              <Box
                role="status"
                sx={{
                  mt: 2.5,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: tokens.border.default,
                  bgcolor: tokens.surface.paper,
                  p: 4,
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{ fontSize: '1rem', color: tokens.text.secondary, fontWeight: 500 }}
                >
                  {t('manager.hotels.roomManagement.noResults')}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}
