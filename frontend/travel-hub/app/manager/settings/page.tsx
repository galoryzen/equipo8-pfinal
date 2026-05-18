'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { getMe } from '@/app/lib/api/auth';
import { getAmenityCatalog } from '@/app/lib/api/catalog';
import {
  addAdminHotelImage,
  addHotelImage,
  deleteAdminHotelImage,
  deleteHotelImage,
  getAdminHotelProfile,
  getAdminHotels,
  getHotelProfile,
  getManagerHotels,
  setPrimaryAdminHotelImage,
  setPrimaryHotelImage,
  updateAdminHotelProfile,
  updateHotelProfile,
} from '@/app/lib/api/manager';
import {
  HotelProfile,
  ManagerHotelItem,
  ManagerPropertyImage,
  PolicyCategory,
  PropertyPolicyItem,
} from '@/app/lib/types/manager';
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
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
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

function getPolicyCategoryLabel(category: PolicyCategory): string {
  const labels: Record<PolicyCategory, string> = {
    CHECK_IN: 'Check-in',
    CHECK_OUT: 'Check-out',
    PETS: 'Pets',
    SMOKING: 'Smoking',
    CHILDREN: 'Children',
    GENERAL: 'General',
  };
  return labels[category];
}

function getPolicyCategoryOptions(currentPolicies: PropertyPolicyItem[]): PolicyCategory[] {
  const allCategories: PolicyCategory[] = [
    'CHECK_IN',
    'CHECK_OUT',
    'PETS',
    'SMOKING',
    'CHILDREN',
    'GENERAL',
  ];
  const usedCategories = new Set(currentPolicies.map((p) => p.category));
  return allCategories.filter((cat) => !usedCategories.has(cat));
}

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

const skeletonBlock = { bgcolor: tokens.surface.subtle };

function ManagerSettingsFormSkeleton({ t }: { t: (key: string) => string }) {
  return (
    <Stack spacing={3} role="status" aria-busy="true" aria-label={t('a11y.loading')}>
      <SectionCard
        title={t('manager.settings.description.title')}
        subtitle={t('manager.settings.description.subtitle')}
      >
        <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={32}
              height={32}
              animation="wave"
              sx={{ ...skeletonBlock, borderRadius: 1 }}
            />
          ))}
        </Stack>
        <Skeleton
          variant="rounded"
          height={168}
          animation="wave"
          sx={{ ...skeletonBlock, borderRadius: '0 0 8px 8px' }}
        />
      </SectionCard>

      <SectionCard
        title={t('manager.settings.amenities.title')}
        subtitle={t('manager.settings.amenities.subtitle')}
      >
        {[1, 2, 3].map((row) => (
          <Box key={row} sx={{ mb: row < 3 ? 2.25 : 0 }}>
            <Skeleton
              variant="text"
              width={160}
              height={22}
              animation="wave"
              sx={{ ...skeletonBlock, mb: 1, maxWidth: '100%' }}
            />
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {[72, 96, 88, 78, 84, 68].map((w, i) => (
                <Skeleton
                  key={`${row}-${i}`}
                  variant="rounded"
                  width={w}
                  height={36}
                  animation="wave"
                  sx={{ ...skeletonBlock, borderRadius: '10px' }}
                />
              ))}
            </Stack>
          </Box>
        ))}
      </SectionCard>

      <SectionCard
        title={t('manager.settings.policy.title')}
        subtitle={t('manager.settings.policy.subtitle')}
      >
        <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={32}
              height={32}
              animation="wave"
              sx={{ ...skeletonBlock, borderRadius: 1 }}
            />
          ))}
        </Stack>
        <Skeleton
          variant="rounded"
          height={120}
          animation="wave"
          sx={{ ...skeletonBlock, borderRadius: '0 0 8px 8px' }}
        />
      </SectionCard>

      <SectionCard
        title={t('manager.settings.gallery.title')}
        subtitle={t('manager.settings.gallery.subtitle')}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Skeleton
            variant="rounded"
            width={168}
            height={36}
            animation="wave"
            sx={{ ...skeletonBlock, borderRadius: '10px' }}
          />
        </Box>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Box
              key={i}
              sx={{
                aspectRatio: '4/3',
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: tokens.border.subtle,
              }}
            >
              <Skeleton
                variant="rounded"
                animation="wave"
                width="100%"
                height="100%"
                sx={{ ...skeletonBlock, height: '100%', borderRadius: 0 }}
              />
            </Box>
          ))}
        </Box>
      </SectionCard>
    </Stack>
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

  const [listLoading, setListLoading] = useState(true);
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [propertyID, setPropertyID] = useState<string | null>(null);
  const [properties, setProperties] = useState<ManagerHotelItem[]>([]);
  const [profile, setProfile] = useState<HotelProfile | null>(null);
  const [amenityCatalog, setAmenityCatalog] = useState<AmenityCatalogItem[]>([]);

  const [description, setDescription] = useState('');
  const [policies, setPolicies] = useState<PropertyPolicyItem[]>([]);
  const [newCategory, setNewCategory] = useState<PolicyCategory | ''>('');
  const [newDescription, setNewDescription] = useState('');
  // Store backend codes (e.g. "pet_friendly") so PATCH /profile keeps working.
  const [selectedAmenityCodes, setSelectedAmenityCodes] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<ManagerPropertyImage[]>([]);

  const [saving, setSaving] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingDeleteImageId, setPendingDeleteImageId] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [hotelID, setHotelID] = useState<string | undefined>(undefined);
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
    const policiesJson = JSON.stringify(
      policies.sort((a, b) => a.category.localeCompare(b.category))
    );
    const profilePoliciesJson = JSON.stringify(
      (profile.policies ?? []).sort((a, b) => a.category.localeCompare(b.category))
    );
    return (
      (profile.description ?? '') !== description ||
      policiesJson !== profilePoliciesJson ||
      currentAmenityCodes.join('|') !== profileAmenityCodes.join('|')
    );
  }, [description, policies, profile, selectedAmenityCodes]);

  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setListLoading(true);
      try {
        const user = await getMe();
        if (cancelled) return;
        setRole(user?.role ?? null);

        if (user?.role === 'TRAVELER') {
          setProperties([]);
          setAmenityCatalog([]);
          setSnack({ severity: 'error', message: t('manager.settings.errors.loadFailed') });
          return;
        }

        const [hotelList, amenities] = await Promise.all([
          user?.role === 'ADMIN' ? getAdminHotels(1, 100) : getManagerHotels(1, 100),
          getAmenityCatalog(),
        ]);
        if (cancelled) return;
        setAmenityCatalog(amenities);
        setProperties(hotelList.items ?? []);
      } catch {
        if (!cancelled) {
          setSnack({ severity: 'error', message: t('manager.settings.errors.loadFailed') });
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
          setBootstrapComplete(true);
        }
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (!bootstrapComplete) return;

    const items = properties;
    if (items.length === 0) {
      setPropertyID(null);
      setHotelID(undefined);
      return;
    }

    const fromQuery = searchParams.get('id');
    const match = fromQuery ? items.find((p) => p.id === fromQuery) : undefined;
    const targetId = match?.id ?? items[0]?.id ?? null;

    setPropertyID(targetId);

    const hRow = targetId ? items.find((p) => p.id === targetId) : undefined;
    setHotelID(hRow?.hotelId);

    if (targetId && searchParams.get('id') !== targetId) {
      const next = new URLSearchParams(searchParams.toString());
      next.set('id', targetId);
      router.replace(`/manager/settings?${next.toString()}`);
    }
  }, [bootstrapComplete, properties, router, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(selectedId: string) {
      setProfileLoading(true);
      setProfile(null);
      try {
        const queryProperty = isAdmin
          ? await getAdminHotelProfile(selectedId)
          : await getHotelProfile(selectedId, hotelID);
        if (cancelled) return;

        setProfile(queryProperty);
        setDescription(queryProperty.description ?? '');
        setPolicies(queryProperty.policies ?? []);
        setSelectedAmenityCodes(new Set(queryProperty.amenity_codes ?? []));
        setImages(queryProperty.images ?? []);
      } catch {
        if (!cancelled) {
          setProfile(null);
          setSnack({ severity: 'error', message: t('manager.settings.errors.loadFailed') });
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    if (!bootstrapComplete || !propertyID || role === null) return;
    void loadProfile(propertyID);
    return () => {
      cancelled = true;
    };
  }, [bootstrapComplete, propertyID, hotelID, isAdmin, role, t]);

  function resetEdits() {
    if (!profile) return;
    setDescription(profile.description ?? '');
    setPolicies(profile.policies ?? []);
    setSelectedAmenityCodes(new Set(profile.amenity_codes ?? []));
    setImages(profile.images ?? []);
  }

  async function handleSave() {
    if (!propertyID) return;
    setSaving(true);
    try {
      const updated = isAdmin
        ? await updateAdminHotelProfile(propertyID, {
            description,
            amenity_codes: [...selectedAmenityCodes],
            policies,
          })
        : await updateHotelProfile(
            propertyID,
            {
              description,
              amenity_codes: [...selectedAmenityCodes],
              policies,
            },
            hotelID
          );
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
    if (!propertyID) return;
    try {
      const img = isAdmin
        ? await addAdminHotelImage(propertyID, payload)
        : await addHotelImage(propertyID, payload, hotelID);
      setImages((prev) => [...prev, img].sort((a, b) => a.display_order - b.display_order));
      setSnack({ severity: 'success', message: t('manager.settings.snackbar.imageAdded') });
    } catch {
      setSnack({ severity: 'error', message: t('manager.settings.errors.addImageFailed') });
      throw new Error('add image failed');
    }
  }

  async function handleDeleteImage(imageId: string): Promise<boolean> {
    if (!propertyID) return false;
    try {
      if (isAdmin) {
        await deleteAdminHotelImage(propertyID, imageId);
      } else {
        await deleteHotelImage(propertyID, imageId, hotelID);
      }
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
    if (!propertyID) return;
    try {
      const list = isAdmin
        ? await setPrimaryAdminHotelImage(propertyID, imageId)
        : await setPrimaryHotelImage(propertyID, imageId, hotelID);
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

  const selectedHotelName =
    profile?.name ?? properties.find((p) => p.id === propertyID)?.name ?? '';

  const profileMatchesSelection = Boolean(
    profile && propertyID && String(profile.id) === propertyID
  );
  const showSettingsForm = Boolean(profileMatchesSelection && !profileLoading);
  const showSwitchingPlaceholder = Boolean(
    propertyID && profileLoading && !profileMatchesSelection
  );
  const showProfileLoadError = Boolean(propertyID && !profileLoading && !profileMatchesSelection);

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
      {profile ? (
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
      ) : null}
    </Box>
  );

  if (listLoading) {
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

  if (bootstrapComplete && (properties.length === 0 || !propertyID)) {
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
          properties={properties}
          value={propertyID}
          sectionLabel={t('manager.settings.breadcrumb.settings')}
          selectAriaLabel={t('manager.settings.breadcrumb.settings')}
          onPropertyChange={(nextId) => {
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
            href={`/manager/settings?id=${propertyID}`}
            sx={{ textTransform: 'none', fontWeight: 800, color: tokens.text.secondary, px: 0.75 }}
          >
            {selectedHotelName || '—'}
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

        {showSwitchingPlaceholder ? (
          <Box>
            {pageHeaderTitle}
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.75 }}>
              <LocationOnOutlinedIcon sx={{ fontSize: 18, color: tokens.text.muted }} />
              <Typography
                sx={{ fontSize: '0.875rem', fontWeight: 700, color: tokens.text.secondary }}
              >
                {selectedHotelName || '—'}
              </Typography>
            </Stack>
          </Box>
        ) : profileMatchesSelection && profile ? (
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
        ) : showProfileLoadError ? (
          <Box>{pageHeaderTitle}</Box>
        ) : (
          <SectionCard
            title={t('manager.settings.title')}
            subtitle={t('manager.settings.errors.loadFailed')}
          >
            <Button
              variant="contained"
              onClick={() => router.push('/manager')}
              sx={{ textTransform: 'none', fontWeight: 800, bgcolor: tokens.brand.accentOrange }}
            >
              {t('manager.hotels.admin.navbar.dashboard')}
            </Button>
          </SectionCard>
        )}
      </Box>

      {showSettingsForm ? (
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
            <Stack spacing={2}>
              {/* Existing policies list */}
              {policies.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {t('manager.settings.policy.existingPolicies')}
                  </Typography>
                  <Stack spacing={1}>
                    {policies.map((item) => (
                      <Box
                        key={item.category}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          p: 1.5,
                          border: '1px solid',
                          borderColor: tokens.border.subtle,
                          borderRadius: 1,
                          bgcolor: tokens.surface.subtle,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: tokens.text.primary,
                              mb: 0.5,
                            }}
                          >
                            {getPolicyCategoryLabel(item.category)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: tokens.text.secondary }}>
                            {item.description}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setPolicies((prev) => prev.filter((p) => p.category !== item.category));
                          }}
                          sx={{
                            color: tokens.text.secondary,
                            '&:hover': { color: 'error.main' },
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Add new policy form */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('manager.settings.policy.addNew')}
                </Typography>
                <Stack spacing={1}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>{t('manager.settings.policy.categoryLabel')}</InputLabel>
                    <Select
                      value={newCategory}
                      label={t('manager.settings.policy.categoryLabel')}
                      onChange={(e) => setNewCategory(e.target.value as PolicyCategory)}
                    >
                      {getPolicyCategoryOptions(policies).map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {getPolicyCategoryLabel(cat)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    placeholder={t('manager.settings.policy.descriptionPlaceholder')}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                  />

                  <Button
                    variant="contained"
                    onClick={() => {
                      if (newCategory && newDescription.trim()) {
                        setPolicies((prev) => [
                          ...prev,
                          { category: newCategory, description: newDescription },
                        ]);
                        setNewCategory('');
                        setNewDescription('');
                      }
                    }}
                    disabled={!newCategory || !newDescription.trim()}
                    startIcon={<AddOutlinedIcon />}
                  >
                    {t('manager.settings.policy.addButton')}
                  </Button>
                </Stack>
              </Box>
            </Stack>
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
                      alt={img.caption ?? profile?.name ?? ''}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
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
      ) : showSwitchingPlaceholder ? (
        <ManagerSettingsFormSkeleton t={t} />
      ) : showProfileLoadError ? (
        <SectionCard
          title={t('manager.settings.title')}
          subtitle={t('manager.settings.errors.loadFailed')}
        >
          <Button
            variant="contained"
            onClick={() => router.push('/manager')}
            sx={{ textTransform: 'none', fontWeight: 800, bgcolor: tokens.brand.accentOrange }}
          >
            {t('manager.hotels.admin.navbar.dashboard')}
          </Button>
        </SectionCard>
      ) : null}

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
