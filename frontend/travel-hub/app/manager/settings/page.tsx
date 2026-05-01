'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { getAmenityCatalog } from '@/app/lib/api/catalog';
import {
  type HotelProfile,
  type ManagerHotelItem,
  type ManagerPropertyImage,
  addHotelImage,
  deleteHotelImage,
  getHotelProfile,
  getManagerHotels,
  setPrimaryHotelImage,
  updateHotelProfile,
} from '@/app/lib/api/manager';
import { tokens } from '@/lib/theme/tokens';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CodeIcon from '@mui/icons-material/Code';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LinkIcon from '@mui/icons-material/Link';
import LocalBarOutlinedIcon from '@mui/icons-material/LocalBarOutlined';
import LocalParkingOutlinedIcon from '@mui/icons-material/LocalParkingOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import PoolOutlinedIcon from '@mui/icons-material/PoolOutlined';
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined';
import RoomServiceOutlinedIcon from '@mui/icons-material/RoomServiceOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SpaOutlinedIcon from '@mui/icons-material/SpaOutlined';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import WifiOutlinedIcon from '@mui/icons-material/WifiOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import { ManagerSettingsHotelSelect } from './ManagerSettingsHotelSelect';

type AmenityCatalogItem = { code: string; name: string };

type AmenityCategory = 'PROPERTY_FEATURES' | 'LEISURE_WELLNESS' | 'SERVICES';

const AMENITY_CATEGORY: Record<string, AmenityCategory> = {
  WIFI: 'PROPERTY_FEATURES',
  RESTAURANT: 'PROPERTY_FEATURES',
  BAR: 'PROPERTY_FEATURES',
  PARKING: 'PROPERTY_FEATURES',
  PET_FRIENDLY: 'PROPERTY_FEATURES',
  POOL: 'LEISURE_WELLNESS',
  FITNESS: 'LEISURE_WELLNESS',
  SPA: 'LEISURE_WELLNESS',
  FRONT_DESK_24H: 'SERVICES',
};

const AMENITY_ICON: Record<string, React.ReactNode> = {
  WIFI: <WifiOutlinedIcon fontSize="small" />,
  RESTAURANT: <RestaurantOutlinedIcon fontSize="small" />,
  BAR: <LocalBarOutlinedIcon fontSize="small" />,
  PARKING: <LocalParkingOutlinedIcon fontSize="small" />,
  PET_FRIENDLY: <PetsOutlinedIcon fontSize="small" />,
  POOL: <PoolOutlinedIcon fontSize="small" />,
  FITNESS: <FitnessCenterOutlinedIcon fontSize="small" />,
  SPA: <SpaOutlinedIcon fontSize="small" />,
  FRONT_DESK_24H: <RoomServiceOutlinedIcon fontSize="small" />,
};

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        bgcolor: tokens.surface.paper,
        borderRadius: 3,
        border: '1px solid',
        borderColor: tokens.border.subtle,
        p: { xs: 2.5, md: 3.5 },
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography
          component="h2"
          sx={{ fontSize: '1.0625rem', fontWeight: 800, color: tokens.text.primary }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{ mt: 0.5, fontSize: '0.875rem', fontWeight: 600, color: tokens.text.secondary }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Divider sx={{ borderColor: tokens.border.subtle, mb: 2.5 }} />
      {children}
    </Box>
  );
}

function RichTextToolbar({ tooltip }: { tooltip: string }) {
  const buttons = [
    { key: 'b', icon: <FormatBoldIcon fontSize="small" /> },
    { key: 'i', icon: <FormatItalicIcon fontSize="small" /> },
    { key: 'u', icon: <FormatUnderlinedIcon fontSize="small" /> },
    { key: 'q', icon: <FormatQuoteIcon fontSize="small" /> },
    { key: 'code', icon: <CodeIcon fontSize="small" /> },
    { key: 'bullets', icon: <FormatListBulletedIcon fontSize="small" /> },
    { key: 'numbers', icon: <FormatListNumberedIcon fontSize="small" /> },
    { key: 'link', icon: <LinkIcon fontSize="small" /> },
    { key: 'img', icon: <ImageOutlinedIcon fontSize="small" /> },
  ];

  return (
    <Box
      sx={{
        bgcolor: tokens.surface.subtle,
        borderRadius: '8px 8px 0 0',
        border: '1px solid',
        borderColor: tokens.border.subtle,
        borderBottom: 'none',
        px: 1,
        py: 0.5,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.25,
        alignItems: 'center',
      }}
    >
      {buttons.map((b) => (
        <Tooltip key={b.key} title={tooltip} placement="top">
          <span>
            <IconButton size="small" disabled>
              {b.icon}
            </IconButton>
          </span>
        </Tooltip>
      ))}
    </Box>
  );
}

function AmenityToggle({
  selected,
  label,
  icon,
  onClick,
}: {
  selected: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      startIcon={icon}
      sx={{
        px: 1.25,
        py: 0.9,
        borderRadius: '10px',
        textTransform: 'none',
        fontWeight: 700,
        fontSize: '0.875rem',
        border: '1px solid',
        borderColor: selected ? tokens.brand.primary : tokens.border.subtle,
        bgcolor: selected ? 'rgba(14,165,233,0.08)' : tokens.surface.paper,
        color: selected ? tokens.brand.primaryOnLight : tokens.text.secondary,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
          borderColor: selected ? tokens.brand.primary : tokens.border.subtleHover,
          bgcolor: selected ? 'rgba(14,165,233,0.1)' : tokens.surface.muted,
        },
      }}
      variant="outlined"
    >
      {label}
    </Button>
  );
}

function AddImageDialog({
  open,
  onClose,
  onSubmit,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { url: string; caption?: string }) => Promise<void>;
  t: (key: string) => string;
}) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const urlError = useMemo(() => {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'invalid';
      return null;
    } catch {
      return 'invalid';
    }
  }, [url]);

  async function handleSubmit() {
    if (!url || urlError) return;
    setSubmitting(true);
    try {
      await onSubmit({ url, caption: caption.trim() ? caption.trim() : undefined });
      setUrl('');
      setCaption('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>
        {t('manager.settings.gallery.addDialog.title')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label={t('manager.settings.gallery.addDialog.urlLabel')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            fullWidth
            error={Boolean(urlError)}
            helperText={t('manager.settings.gallery.addDialog.helper')}
          />
          <TextField
            label={t('manager.settings.gallery.addDialog.captionLabel')}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {t('manager.settings.gallery.addDialog.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!url || Boolean(urlError) || submitting}
          variant="contained"
          sx={{ textTransform: 'none', fontWeight: 800, bgcolor: tokens.brand.accentOrange }}
        >
          {t('manager.settings.gallery.addDialog.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ManagerSettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [hotels, setHotels] = useState<ManagerHotelItem[]>([]);
  const [profile, setProfile] = useState<HotelProfile | null>(null);
  const [amenityCatalog, setAmenityCatalog] = useState<AmenityCatalogItem[]>([]);

  const [description, setDescription] = useState('');
  const [policy, setPolicy] = useState('');
  // Store backend codes (e.g. "pet_friendly") so PATCH /profile keeps working.
  const [selectedAmenityCodes, setSelectedAmenityCodes] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<ManagerPropertyImage[]>([]);

  const [saving, setSaving] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingDeleteImageId, setPendingDeleteImageId] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [snack, setSnack] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null
  );

  const groupedAmenities = useMemo(() => {
    // Keep backend code, but derive uppercase display code for i18n + icon/category maps.
    const map = new Map<string, { code: string; displayCode: string; name: string }>();
    for (const a of amenityCatalog) {
      const displayCode = String(a.code ?? '').toUpperCase();
      map.set(a.code, { code: a.code, displayCode, name: a.name });
    }

    const groups: Record<AmenityCategory, { code: string; displayCode: string; name: string }[]> = {
      PROPERTY_FEATURES: [],
      LEISURE_WELLNESS: [],
      SERVICES: [],
    };

    for (const item of map.values()) {
      const cat = AMENITY_CATEGORY[item.displayCode] ?? 'SERVICES';
      groups[cat].push(item);
    }

    for (const cat of Object.keys(groups) as AmenityCategory[]) {
      groups[cat].sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups;
  }, [amenityCatalog]);

  const dirty = useMemo(() => {
    if (!profile) return false;
    const currentAmenityCodes = [...selectedAmenityCodes].sort();
    const profileAmenityCodes = [...(profile.amenity_codes ?? [])].sort();
    return (
      (profile.description ?? '') !== description ||
      (profile.policy ?? '') !== policy ||
      currentAmenityCodes.join('|') !== profileAmenityCodes.join('|')
    );
  }, [description, policy, profile, selectedAmenityCodes]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [hotelList, amenities] = await Promise.all([getManagerHotels(), getAmenityCatalog()]);
        if (cancelled) return;
        setAmenityCatalog(amenities);

        const items = hotelList.items ?? [];
        setHotels(items);

        const fromQuery = searchParams.get('id');
        const initialId = fromQuery ?? items[0]?.id ?? null;

        if (!initialId) {
          setHotelId(null);
          setProfile(null);
          return;
        }

        setHotelId(initialId);
        if (!fromQuery) {
          const next = new URLSearchParams(searchParams.toString());
          next.set('id', initialId);
          router.replace(`/manager/settings?${next.toString()}`);
        }
      } catch {
        setSnack({ severity: 'error', message: t('manager.settings.errors.loadFailed') });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams, t]);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile(selectedId: string) {
      try {
        const p = await getHotelProfile(selectedId);
        if (cancelled) return;
        setProfile(p);
        setDescription(p.description ?? '');
        setPolicy(p.policy ?? '');
        setSelectedAmenityCodes(new Set(p.amenity_codes ?? []));
        setImages(p.images ?? []);
      } catch {
        if (!cancelled) {
          setProfile(null);
          setSnack({ severity: 'error', message: t('manager.settings.errors.loadFailed') });
        }
      }
    }

    if (!hotelId) return;
    void loadProfile(hotelId);
    return () => {
      cancelled = true;
    };
  }, [hotelId, t]);

  function resetEdits() {
    if (!profile) return;
    setDescription(profile.description ?? '');
    setPolicy(profile.policy ?? '');
    setSelectedAmenityCodes(new Set(profile.amenity_codes ?? []));
    setImages(profile.images ?? []);
  }

  async function handleSave() {
    if (!hotelId) return;
    setSaving(true);
    try {
      const updated = await updateHotelProfile(hotelId, {
        description,
        amenity_codes: [...selectedAmenityCodes],
        policy,
      });
      setProfile(updated);
      setImages(updated.images ?? []);
      setSnack({ severity: 'success', message: t('manager.settings.snackbar.saved') });
    } catch {
      setSnack({ severity: 'error', message: t('manager.settings.errors.saveFailed') });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddImage(payload: { url: string; caption?: string }) {
    if (!hotelId) return;
    try {
      const img = await addHotelImage(hotelId, payload);
      setImages((prev) => [...prev, img].sort((a, b) => a.display_order - b.display_order));
      setSnack({ severity: 'success', message: t('manager.settings.snackbar.imageAdded') });
    } catch {
      setSnack({ severity: 'error', message: t('manager.settings.errors.addImageFailed') });
      throw new Error('add image failed');
    }
  }

  async function handleDeleteImage(imageId: string): Promise<boolean> {
    if (!hotelId) return false;
    try {
      await deleteHotelImage(hotelId, imageId);
      setImages((prev) =>
        prev.filter((i) => i.id !== imageId).map((img, idx) => ({ ...img, display_order: idx }))
      );
      setSnack({ severity: 'success', message: t('manager.settings.snackbar.imageDeleted') });
      return true;
    } catch {
      setSnack({ severity: 'error', message: t('manager.settings.errors.deleteFailed') });
      return false;
    }
  }

  async function handleSetPrimary(imageId: string) {
    if (!hotelId) return;
    try {
      const list = await setPrimaryHotelImage(hotelId, imageId);
      setImages(list);
      setSnack({ severity: 'success', message: t('manager.settings.snackbar.primaryUpdated') });
    } catch {
      setSnack({ severity: 'error', message: t('manager.settings.errors.saveFailed') });
    }
  }

  async function handleConfirmDeleteImage() {
    if (!pendingDeleteImageId) return;
    setDeleteInProgress(true);
    try {
      const ok = await handleDeleteImage(pendingDeleteImageId);
      if (ok) setPendingDeleteImageId(null);
    } finally {
      setDeleteInProgress(false);
    }
  }

  const pageHeaderTitle = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
        {t('manager.settings.title')}
      </Typography>
      <Box
        sx={{
          px: 1.25,
          py: 0.5,
          borderRadius: 999,
          fontSize: '0.75rem',
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          border: '1px solid',
          borderColor: dirty ? tokens.brand.accentOrange : tokens.state.successBorder,
          color: dirty ? tokens.brand.accentOrangeFg : tokens.state.successFg,
          bgcolor: dirty ? tokens.brand.accentOrangeSoft : tokens.state.successBg,
        }}
      >
        {dirty ? t('manager.settings.status.draft') : t('manager.settings.status.published')}
      </Box>
    </Box>
  );

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: 'calc(100vh - 6rem)',
          width: '100%',
          pb: 3,
          backgroundColor: tokens.surface.pageWarm,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!hotelId || !profile) {
    return (
      <Box
        sx={{
          minHeight: 'calc(100vh - 6rem)',
          width: '100%',
          pb: 3,
          backgroundColor: tokens.surface.pageWarm,
        }}
      >
        <Box component="header" sx={{ mb: 3 }}>
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
            {t('manager.settings.title')}
          </Typography>
        </Box>
        <SectionCard
          title={t('manager.settings.title')}
          subtitle={t('manager.settings.errors.noHotels')}
        >
          <Button
            variant="contained"
            onClick={() => router.push('/manager')}
            sx={{ textTransform: 'none', fontWeight: 800, bgcolor: tokens.brand.accentOrange }}
          >
            {t('manager.hotels.admin.navbar.dashboard')}
          </Button>
        </SectionCard>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 6rem)',
        width: '100%',
        pb: 3,
        backgroundColor: tokens.surface.pageWarm,
      }}
    >
      <Box component="header" sx={{ mb: 3 }}>
        <ManagerSettingsHotelSelect
          hotels={hotels}
          value={hotelId}
          sectionLabel={t('manager.settings.breadcrumb.settings')}
          selectAriaLabel={t('manager.settings.breadcrumb.settings')}
          onHotelChange={(nextId) => {
            setHotelId(nextId);
            const next = new URLSearchParams(searchParams.toString());
            next.set('id', nextId);
            router.replace(`/manager/settings?${next.toString()}`);
          }}
        />
        <Box
          component="nav"
          aria-label={t('manager.settings.breadcrumb.settings')}
          sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}
        >
          <Button
            component={Link}
            href="/manager/settings"
            sx={{ textTransform: 'none', fontWeight: 800, color: tokens.text.secondary, px: 0.75 }}
          >
            {t('manager.settings.breadcrumb.settings')}
          </Button>
          <NavigateNextIcon
            aria-hidden="true"
            sx={{ fontSize: 18, color: tokens.text.muted, mx: 0.25 }}
          />
          <Button
            component={Link}
            href={`/manager/settings?id=${hotelId}`}
            sx={{ textTransform: 'none', fontWeight: 800, color: tokens.text.secondary, px: 0.75 }}
          >
            {profile.name}
          </Button>
          <NavigateNextIcon
            aria-hidden="true"
            sx={{ fontSize: 18, color: tokens.text.muted, mx: 0.25 }}
          />
          <Typography
            aria-current="page"
            sx={{ fontSize: '0.9375rem', fontWeight: 700, color: tokens.text.primary, px: 0.75 }}
          >
            {t('manager.settings.breadcrumb.editProfile')}
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            {pageHeaderTitle}
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.75 }}>
              <LocationOnOutlinedIcon sx={{ fontSize: 18, color: tokens.text.muted }} />
              <Typography
                sx={{ fontSize: '0.875rem', fontWeight: 700, color: tokens.text.secondary }}
              >
                {profile.name} | {profile.city}, {profile.country}
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.25} sx={{ mt: { xs: 2, sm: 0 } }}>
            <Button
              type="button"
              onClick={resetEdits}
              disabled={!dirty || saving}
              variant="outlined"
              sx={{
                textTransform: 'none',
                fontWeight: 800,
                borderRadius: '10px',
                borderColor: tokens.border.subtle,
                color: tokens.text.secondary,
                '&:hover': { borderColor: tokens.border.subtleHover },
              }}
            >
              {t('manager.settings.actions.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              variant="contained"
              startIcon={<SaveOutlinedIcon />}
              sx={{
                bgcolor: tokens.brand.accentOrange,
                color: 'white',
                fontWeight: 900,
                textTransform: 'none',
                borderRadius: '10px',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: tokens.brand.accentOrange,
                  filter: 'brightness(0.95)',
                  boxShadow: 'none',
                },
              }}
            >
              {t('manager.settings.actions.saveChanges')}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Stack spacing={3}>
        <SectionCard
          title={t('manager.settings.description.title')}
          subtitle={t('manager.settings.description.subtitle')}
        >
          <RichTextToolbar tooltip={t('manager.settings.toolbar.comingSoon')} />
          <TextField
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={6}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '0 0 8px 8px' },
            }}
          />
        </SectionCard>

        <SectionCard
          title={t('manager.settings.amenities.title')}
          subtitle={t('manager.settings.amenities.subtitle')}
        >
          <Stack spacing={2.25}>
            {(
              [
                {
                  key: 'PROPERTY_FEATURES' as const,
                  labelKey: 'manager.settings.amenities.groups.propertyFeatures',
                },
                {
                  key: 'LEISURE_WELLNESS' as const,
                  labelKey: 'manager.settings.amenities.groups.leisureWellness',
                },
                {
                  key: 'SERVICES' as const,
                  labelKey: 'manager.settings.amenities.groups.services',
                },
              ] as const
            ).map((group) => (
              <Box key={group.key}>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: tokens.text.muted,
                    mb: 1,
                  }}
                >
                  {t(group.labelKey)}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(groupedAmenities[group.key] ?? []).map((a) => {
                    const selected = selectedAmenityCodes.has(a.code);
                    const translated = t(`manager.settings.amenities.items.${a.displayCode}`, {
                      defaultValue: '',
                    }) as string;
                    const label = translated || a.name || a.displayCode || a.code;
                    return (
                      <AmenityToggle
                        key={a.code}
                        selected={selected}
                        label={label}
                        icon={AMENITY_ICON[a.displayCode] ?? <AddOutlinedIcon fontSize="small" />}
                        onClick={() => {
                          setSelectedAmenityCodes((prev) => {
                            const next = new Set(prev);
                            if (next.has(a.code)) next.delete(a.code);
                            else next.add(a.code);
                            return next;
                          });
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Stack>
        </SectionCard>

        <SectionCard
          title={t('manager.settings.policy.title')}
          subtitle={t('manager.settings.policy.subtitle')}
        >
          <RichTextToolbar tooltip={t('manager.settings.toolbar.comingSoon')} />
          <TextField
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
            placeholder={t('manager.settings.policy.placeholder')}
            multiline
            minRows={4}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '0 0 8px 8px' },
            }}
          />
        </SectionCard>

        <SectionCard
          title={t('manager.settings.gallery.title')}
          subtitle={t('manager.settings.gallery.subtitle')}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              type="button"
              onClick={() => setAddDialogOpen(true)}
              variant="contained"
              startIcon={<ImageOutlinedIcon />}
              sx={{
                bgcolor: tokens.brand.accentOrangeSoft,
                color: tokens.brand.accentOrangeFg,
                textTransform: 'none',
                fontWeight: 800,
                borderRadius: '10px',
                boxShadow: 'none',
                '&:hover': { bgcolor: `${tokens.brand.accentOrange}26`, boxShadow: 'none' },
              }}
            >
              {t('manager.settings.gallery.addNew')}
            </Button>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            }}
          >
            {images
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((img) => (
                <Box
                  key={img.id}
                  sx={{
                    position: 'relative',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: tokens.border.subtle,
                    aspectRatio: '4/3',
                    bgcolor: tokens.surface.subtle,
                    '&:hover .overlay': { opacity: 1 },
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.caption ?? profile.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {img.display_order === 0 ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        px: 1,
                        py: 0.5,
                        borderRadius: 999,
                        bgcolor: tokens.brand.accentOrangeFg,
                        color: tokens.surface.paper,
                        fontWeight: 900,
                        fontSize: '0.72rem',
                      }}
                    >
                      {t('manager.settings.gallery.primary')}
                    </Box>
                  ) : null}
                  <Box
                    className="overlay"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      bgcolor: 'rgba(15,23,42,0.55)',
                      opacity: 0,
                      transition: 'opacity 180ms ease',
                    }}
                  >
                    {img.display_order !== 0 ? (
                      <Tooltip title={t('manager.settings.gallery.actions.setPrimary')}>
                        <IconButton
                          onClick={() => handleSetPrimary(img.id)}
                          sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.12)' }}
                        >
                          <StarBorderIcon />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    <Tooltip title={t('manager.settings.gallery.actions.delete')}>
                      <IconButton
                        onClick={() => setPendingDeleteImageId(img.id)}
                        sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.12)' }}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}

            <Button
              type="button"
              onClick={() => setAddDialogOpen(true)}
              sx={{
                borderRadius: 2,
                border: '1.5px dashed',
                borderColor: tokens.border.subtleHover,
                bgcolor: tokens.surface.subtle,
                aspectRatio: '4/3',
                display: 'grid',
                placeItems: 'center',
                textTransform: 'none',
                color: tokens.text.secondary,
                fontWeight: 900,
              }}
            >
              <Stack spacing={0.5} alignItems="center">
                <AddOutlinedIcon />
                <Typography sx={{ fontWeight: 900 }}>
                  {t('manager.settings.gallery.uploadImage')}
                </Typography>
              </Stack>
            </Button>
          </Box>
        </SectionCard>
      </Stack>

      <AddImageDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={handleAddImage}
        t={t}
      />

      <Dialog
        open={pendingDeleteImageId !== null}
        onClose={() => {
          if (!deleteInProgress) setPendingDeleteImageId(null);
        }}
        fullWidth
        maxWidth="xs"
        aria-labelledby="delete-image-dialog-title"
      >
        <DialogTitle id="delete-image-dialog-title" sx={{ fontWeight: 900 }}>
          {t('manager.settings.gallery.deleteDialog.title')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9375rem', color: tokens.text.secondary, fontWeight: 500 }}>
            {t('manager.settings.gallery.deleteDialog.message')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setPendingDeleteImageId(null)}
            disabled={deleteInProgress}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {t('manager.settings.gallery.deleteDialog.cancel')}
          </Button>
          <Button
            onClick={() => void handleConfirmDeleteImage()}
            disabled={deleteInProgress}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none', fontWeight: 800, minWidth: 120 }}
          >
            {deleteInProgress ? (
              <CircularProgress size={22} sx={{ color: 'inherit' }} />
            ) : (
              t('manager.settings.gallery.deleteDialog.confirm')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? (
          <Alert
            onClose={() => setSnack(null)}
            severity={snack.severity}
            variant="filled"
            sx={{ fontWeight: 700 }}
          >
            {snack.message}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
    </Box>
  );
}
