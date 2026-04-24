'use client';

import { useEffect, useId, useState } from 'react';

import {
  type CancellationPolicyTypeStr,
  type RoomTypeManagerItem,
  type RoomTypePromotionOut,
  createPromotion,
  deletePromotion,
  getRatePlanCancellationPolicy,
  getRoomTypePromotion,
  updateRatePlanCancellationPolicy,
} from '@/app/lib/api/manager';
import { tokens } from '@/lib/theme/tokens';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Radio from '@mui/material/Radio';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useTranslation } from 'react-i18next';

import { type CancellationPolicyType } from '../_data';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date | null): string {
  if (!d) return '';
  return d.toISOString().split('T')[0];
}

function parseDateStr(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon,
  titleKey,
  iconColor,
  iconBg,
  children,
}: {
  icon: React.ReactNode;
  titleKey: string;
  iconColor: string;
  iconBg: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box
          aria-hidden="true"
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: iconColor,
          }}
        >
          {icon}
        </Box>
        <Typography
          component="h2"
          sx={{ fontSize: '1.0625rem', fontWeight: 800, color: tokens.text.primary }}
        >
          {t(titleKey)}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

const PICKER_TEXT_FIELD_SX = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    bgcolor: tokens.surface.pageCool,
    borderRadius: 2,
    fontSize: '0.9375rem',
    '& fieldset': { borderColor: tokens.border.default },
    '&:hover fieldset': { borderColor: tokens.border.subtleHover },
    '&.Mui-focused fieldset': { borderColor: tokens.brand.accentOrange },
  },
  '& .MuiInputBase-input': { py: 1.25 },
};

const INPUT_SX = {
  width: '100%',
  bgcolor: tokens.surface.pageCool,
  borderRadius: 2,
  fontSize: '0.9375rem',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.border.default },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.border.subtleHover },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.brand.accentOrange },
  '& input': { py: 1.25 },
};

const LABEL_SX = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 700,
  color: tokens.text.secondary,
  mb: 1,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export default function RoomTypeManageView({
  hotelId,
  hotelName,
  roomType,
  onBack,
}: {
  hotelId: string;
  hotelName: string;
  roomType: RoomTypeManagerItem;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const discountId = useId();
  const promoNameId = useId();
  const refundPctId = useId();
  const policyGroupLabelId = useId();
  const cancellationApplyHelperId = useId();

  // ── Promotion & policy state ─────────────────────────────────────────────────
  const [existingPromotion, setExistingPromotion] = useState<RoomTypePromotionOut | null>(null);
  const [promoLoading, setPromoLoading] = useState(true);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [promotionName, setPromotionName] = useState('');
  const [availabilityStart, setAvailabilityStart] = useState<Date | null>(new Date());
  const [availabilityEnd, setAvailabilityEnd] = useState<Date | null>(new Date());
  const [discountPct, setDiscountPct] = useState('0');
  const [cancellationPolicy, setCancellationPolicy] =
    useState<CancellationPolicyType>('totallyRefundable');
  const [refundPct, setRefundPct] = useState('100');
  const [cancellationApplyDate, setCancellationApplyDate] = useState<Date | null>(new Date());

  // ── Action state ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error'>('success');

  // ── Field-level errors ───────────────────────────────────────────────────────
  const [promoNameError, setPromoNameError] = useState(false);
  const [discountError, setDiscountError] = useState(false);
  const [refundPctError, setRefundPctError] = useState(false);

  // Map DB cancellation policy type → UI type
  const DB_TO_UI: Record<CancellationPolicyTypeStr, CancellationPolicyType> = {
    FULL: 'totallyRefundable',
    PARTIAL: 'partialRefundable',
    NON_REFUNDABLE: 'nonRefundable',
  };

  // ── Load existing promotion + cancellation policy on mount ──────────────────
  useEffect(() => {
    let cancelled = false;

    const promoFetch = getRoomTypePromotion(roomType.id);
    const policyFetch = roomType.rate_plan_id
      ? getRatePlanCancellationPolicy(roomType.rate_plan_id)
      : Promise.resolve(null);

    Promise.all([promoFetch, policyFetch])
      .then(([promo, policy]) => {
        if (cancelled) return;

        // Populate promotion form fields
        setExistingPromotion(promo);
        if (promo) {
          setPromotionName(promo.name);
          setDiscountPct(String(promo.discount_value));
          setAvailabilityStart(parseDateStr(promo.start_date));
          setAvailabilityEnd(parseDateStr(promo.end_date));
        }

        // Populate cancellation policy radio from real DB type
        if (policy) {
          setCancellationPolicy(DB_TO_UI[policy.type]);
          if (policy.type === 'PARTIAL' && policy.refund_percent != null) {
            setRefundPct(String(policy.refund_percent));
          }
        }

        setPromoLoading(false);
      })
      .catch(() => {
        if (!cancelled) setPromoLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomType.id, roomType.rate_plan_id]);

  // Map UI cancellation policy type → DB type
  const UI_TO_DB: Record<CancellationPolicyType, CancellationPolicyTypeStr> = {
    totallyRefundable: 'FULL',
    partialRefundable: 'PARTIAL',
    nonRefundable: 'NON_REFUNDABLE',
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!roomType.rate_plan_id) return;

    // ── Field validation ──
    const discountValue = parseFloat(discountPct);
    const refundPctValue = parseInt(refundPct);

    const nameInvalid = !promotionName.trim();
    const discountInvalid = isNaN(discountValue) || discountValue < 1 || discountValue > 100;
    const refundPctInvalid =
      cancellationPolicy === 'partialRefundable' &&
      (isNaN(refundPctValue) || refundPctValue < 1 || refundPctValue > 99);

    setPromoNameError(nameInvalid);
    setDiscountError(discountInvalid);
    setRefundPctError(refundPctInvalid);

    if (nameInvalid || discountInvalid || refundPctInvalid) return;

    setSaving(true);
    setSaveError(null);

    const errors: string[] = [];

    // 1. Save cancellation policy (always)
    try {
      const policyPayload: Parameters<typeof updateRatePlanCancellationPolicy>[1] = {
        type: UI_TO_DB[cancellationPolicy],
        ...(cancellationPolicy === 'partialRefundable' ? { refund_percent: refundPctValue } : {}),
      };
      await updateRatePlanCancellationPolicy(roomType.rate_plan_id, policyPayload);
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : 'Failed to save cancellation policy');
    }

    // 2. Save promotion
    const startStr = toDateStr(availabilityStart);
    const endStr = toDateStr(availabilityEnd);
    if (!startStr || !endStr) {
      errors.push(t('manager.hotels.promotion.errorRequired'));
    } else {
      try {
        const created = await createPromotion(hotelId, {
          rate_plan_id: roomType.rate_plan_id,
          name: promotionName.trim(),
          discount_type: 'PERCENT',
          discount_value: discountValue,
          start_date: startStr,
          end_date: endStr,
        });
        setExistingPromotion({
          ...created,
          rate_plan_id: roomType.rate_plan_id,
        } as RoomTypePromotionOut);
      } catch (err: unknown) {
        errors.push(err instanceof Error ? err.message : 'Failed to save promotion');
      }
    }

    setSaving(false);

    if (errors.length > 0) {
      setSaveError(errors.join(' | '));
    } else {
      setSnackMessage(t('manager.hotels.roomTypeManage.savedSuccess'));
      setSnackSeverity('success');
      setSnackOpen(true);
      onBack();
    }
  }

  async function handleDelete() {
    if (!existingPromotion) return;
    setDeleting(true);
    try {
      await deletePromotion(existingPromotion.id);
      setExistingPromotion(null);
      setPromotionName('');
      setDiscountPct('0');
      setAvailabilityStart(new Date());
      setAvailabilityEnd(new Date());
      setSnackMessage(t('manager.hotels.promotion.deleteSuccess'));
      setSnackSeverity('success');
      setSnackOpen(true);
    } catch (err: unknown) {
      setSnackMessage(err instanceof Error ? err.message : 'Failed to delete');
      setSnackSeverity('error');
      setSnackOpen(true);
    } finally {
      setDeleting(false);
    }
  }

  const canSave = !!roomType.rate_plan_id;

  const POLICY_OPTIONS: {
    type: CancellationPolicyType;
    icon: React.ReactNode;
    iconColor: string;
    iconBg: string;
    labelKey: string;
    descKey: string;
  }[] = [
    {
      type: 'totallyRefundable',
      icon: <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />,
      iconColor: tokens.state.successFg,
      iconBg: tokens.state.successBg,
      labelKey: 'manager.hotels.roomTypeManage.cancellationPolicy.totallyRefundable',
      descKey: 'manager.hotels.roomTypeManage.cancellationPolicy.totallyRefundableDesc',
    },
    {
      type: 'partialRefundable',
      icon: <SyncIcon sx={{ fontSize: 20 }} />,
      iconColor: tokens.brand.accentOrangeFg,
      iconBg: tokens.state.warningBg,
      labelKey: 'manager.hotels.roomTypeManage.cancellationPolicy.partialRefundable',
      descKey: 'manager.hotels.roomTypeManage.cancellationPolicy.partialRefundableDesc',
    },
    {
      type: 'nonRefundable',
      icon: <CancelOutlinedIcon sx={{ fontSize: 20 }} />,
      iconColor: '#DC2626',
      iconBg: '#FEF2F2',
      labelKey: 'manager.hotels.roomTypeManage.cancellationPolicy.nonRefundable',
      descKey: 'manager.hotels.roomTypeManage.cancellationPolicy.nonRefundableDesc',
    },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          minHeight: 'calc(100vh - 6rem)',
          width: '100%',
          pb: 3,
          backgroundColor: tokens.surface.pageWarm,
        }}
      >
        {/* ── Breadcrumb ── */}
        <Box
          component="nav"
          aria-label={t('manager.hotels.hotelDetail.breadcrumbNav')}
          sx={{ display: 'flex', alignItems: 'center', mb: 2.5, flexWrap: 'wrap' }}
        >
          <Button
            onClick={onBack}
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
          <Button
            onClick={onBack}
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
            {hotelName}
          </Button>
          <NavigateNextIcon
            aria-hidden="true"
            sx={{ fontSize: 18, color: tokens.text.muted, mx: 0.25 }}
          />
          <Typography
            component="span"
            aria-current="page"
            sx={{ fontSize: '0.9375rem', fontWeight: 600, color: tokens.text.primary }}
          >
            {t('manager.hotels.roomTypeManage.breadcrumbManage', { name: roomType.name })}
          </Typography>
        </Box>

        {/* ── Page header ── */}
        <Box
          component="header"
          sx={{
            display: 'flex',
            alignItems: { sm: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: saveError ? 2 : 4,
          }}
        >
          <Box>
            <Typography
              component="h1"
              sx={{
                fontSize: '2rem',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: tokens.text.primary,
                lineHeight: 1.1,
                mb: 0.5,
              }}
            >
              {t('manager.hotels.roomTypeManage.title', { name: roomType.name })}
            </Typography>
            <Typography
              sx={{ fontSize: '0.9375rem', fontWeight: 500, color: tokens.text.secondary }}
            >
              {t('manager.hotels.roomTypeManage.subtitle')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
            {/* Delete button — only shown when a promotion exists */}
            {existingPromotion && (
              <Button
                variant="outlined"
                startIcon={
                  deleting ? (
                    <CircularProgress size={16} sx={{ color: '#DC2626' }} />
                  ) : (
                    <DeleteOutlineIcon />
                  )
                }
                onClick={handleDelete}
                disabled={deleting || saving}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  borderColor: '#DC2626',
                  color: '#DC2626',
                  borderRadius: 2.5,
                  px: 2.5,
                  py: 1.25,
                  '&:hover': { bgcolor: '#FEF2F2', borderColor: '#B91C1C' },
                  '&:disabled': { opacity: 0.6 },
                  '&:focus-visible': {
                    outline: '2px solid #DC2626',
                    outlineOffset: 3,
                  },
                }}
              >
                {t('manager.hotels.promotion.deleteButton')}
              </Button>
            )}

            {/* Save button */}
            <Button
              variant="contained"
              startIcon={
                saving ? (
                  <CircularProgress size={16} sx={{ color: tokens.brand.accentOrangeFg }} />
                ) : (
                  <SaveOutlinedIcon />
                )
              }
              onClick={handleSave}
              disabled={saving || deleting || !canSave || promoLoading}
              title={!canSave ? t('manager.hotels.roomTypeManage.noRatePlan') : undefined}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.9375rem',
                bgcolor: tokens.brand.accentOrangeSoft,
                color: tokens.brand.accentOrangeFg,
                borderRadius: 2.5,
                px: 3,
                py: 1.25,
                '&:hover': { bgcolor: `${tokens.brand.accentOrange}26` },
                '&:disabled': { opacity: 0.6 },
                '&:focus-visible': {
                  outline: `2px solid ${tokens.brand.accentOrange}`,
                  outlineOffset: 3,
                },
              }}
            >
              {t('manager.hotels.roomTypeManage.saveChanges')}
            </Button>
          </Box>
        </Box>

        {saveError && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => setSaveError(null)}
          >
            {saveError}
          </Alert>
        )}

        {/* ── Sections ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* ── Availability Period ── */}
          <SectionCard
            icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 20 }} />}
            titleKey="manager.hotels.roomTypeManage.availabilityPeriod.title"
            iconColor={tokens.brand.primaryOnLight}
            iconBg="#EFF6FF"
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 3,
              }}
            >
              <DateTimePicker
                label={t('manager.hotels.roomTypeManage.availabilityPeriod.startLabel')}
                value={availabilityStart}
                onChange={setAvailabilityStart}
                slotProps={{
                  textField: {
                    id: 'availability-start',
                    fullWidth: true,
                    sx: PICKER_TEXT_FIELD_SX,
                  },
                }}
              />
              <DateTimePicker
                label={t('manager.hotels.roomTypeManage.availabilityPeriod.endLabel')}
                value={availabilityEnd}
                onChange={setAvailabilityEnd}
                slotProps={{
                  textField: {
                    id: 'availability-end',
                    fullWidth: true,
                    sx: PICKER_TEXT_FIELD_SX,
                  },
                }}
              />
            </Box>
          </SectionCard>

          {/* ── Pricing & Offers ── */}
          <SectionCard
            icon={<LocalOfferOutlinedIcon sx={{ fontSize: 20 }} />}
            titleKey="manager.hotels.roomTypeManage.pricingOffers.title"
            iconColor={tokens.brand.accentOrangeFg}
            iconBg={tokens.state.warningBg}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 3,
              }}
            >
              {/* Promotion name */}
              <Box>
                <Typography
                  component="label"
                  htmlFor={promoNameId}
                  sx={{ ...LABEL_SX, color: promoNameError ? '#DC2626' : LABEL_SX.color }}
                >
                  {t('manager.hotels.promotion.nameLabel')}{' '}
                  <Typography component="span" sx={{ color: '#DC2626', fontWeight: 700 }}>
                    *
                  </Typography>
                </Typography>
                <OutlinedInput
                  id={promoNameId}
                  value={promotionName}
                  onChange={(e) => {
                    setPromotionName(e.target.value);
                    if (promoNameError) setPromoNameError(false);
                  }}
                  placeholder={roomType.name}
                  error={promoNameError}
                  sx={{
                    ...INPUT_SX,
                    ...(promoNameError && {
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DC2626' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B91C1C' },
                    }),
                  }}
                />
                {promoNameError && (
                  <Typography sx={{ fontSize: '0.8125rem', color: '#DC2626', mt: 0.75 }}>
                    {t('manager.hotels.promotion.errorNameRequired')}
                  </Typography>
                )}
              </Box>

              {/* Discount */}
              <Box>
                <Typography
                  component="label"
                  htmlFor={discountId}
                  sx={{ ...LABEL_SX, color: discountError ? '#DC2626' : LABEL_SX.color }}
                >
                  {t('manager.hotels.roomTypeManage.pricingOffers.discountLabel')}{' '}
                  <Typography component="span" sx={{ color: '#DC2626', fontWeight: 700 }}>
                    *
                  </Typography>
                </Typography>
                <OutlinedInput
                  id={discountId}
                  type="number"
                  value={discountPct}
                  onChange={(e) => {
                    setDiscountPct(e.target.value);
                    if (discountError) setDiscountError(false);
                  }}
                  error={discountError}
                  inputProps={{
                    min: 1,
                    max: 100,
                  }}
                  endAdornment={
                    <InputAdornment position="end">
                      <Typography
                        aria-hidden="true"
                        sx={{ fontWeight: 700, color: tokens.text.muted, fontSize: '0.9375rem' }}
                      >
                        %
                      </Typography>
                    </InputAdornment>
                  }
                  sx={{
                    ...INPUT_SX,
                    ...(discountError && {
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DC2626' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B91C1C' },
                    }),
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    color: discountError ? '#DC2626' : tokens.text.muted,
                    mt: 0.75,
                    lineHeight: 1.5,
                  }}
                >
                  {discountError
                    ? t('manager.hotels.promotion.errorDiscountRange')
                    : t('manager.hotels.roomTypeManage.pricingOffers.discountHelper')}
                </Typography>
              </Box>
            </Box>
          </SectionCard>

          {/* ── Cancellation Policy ── */}
          <SectionCard
            icon={<ShieldOutlinedIcon sx={{ fontSize: 20 }} />}
            titleKey="manager.hotels.roomTypeManage.cancellationPolicy.title"
            iconColor={tokens.brand.primaryOnLight}
            iconBg="#EFF6FF"
          >
            <Typography
              id={policyGroupLabelId}
              sx={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: tokens.text.secondary,
                mb: 1.5,
              }}
            >
              {t('manager.hotels.roomTypeManage.cancellationPolicy.policyTypeLabel')}
            </Typography>

            <Box
              role="radiogroup"
              aria-labelledby={policyGroupLabelId}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              {POLICY_OPTIONS.map(({ type, icon, iconColor, iconBg, labelKey, descKey }) => {
                const selected = cancellationPolicy === type;
                return (
                  <Box
                    key={type}
                    component="label"
                    sx={{
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      p: 2,
                      borderRadius: 2,
                      border: '1.5px solid',
                      borderColor: selected ? tokens.brand.accentOrange : tokens.border.default,
                      bgcolor: selected ? tokens.state.warningBg : tokens.surface.paper,
                      transition: 'border-color 0.15s, background-color 0.15s',
                      '&:hover': {
                        borderColor: selected
                          ? tokens.brand.accentOrange
                          : tokens.border.subtleHover,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 1.5,
                      }}
                    >
                      <Box
                        aria-hidden="true"
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: iconBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: iconColor,
                        }}
                      >
                        {icon}
                      </Box>
                      <Radio
                        id={`policy-${type}`}
                        name="cancellation-policy"
                        value={type}
                        checked={selected}
                        onChange={() => setCancellationPolicy(type)}
                        size="small"
                        sx={{
                          p: 0,
                          color: tokens.border.subtleHover,
                          '&.Mui-checked': { color: tokens.brand.accentOrange },
                          '&:focus-visible': {
                            outline: `2px solid ${tokens.brand.accentOrange}`,
                            outlineOffset: 2,
                            borderRadius: '50%',
                          },
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        color: tokens.text.primary,
                        mb: 0.5,
                      }}
                    >
                      {t(labelKey)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.8125rem',
                        color: tokens.text.secondary,
                        lineHeight: 1.5,
                      }}
                    >
                      {t(descKey)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {cancellationPolicy === 'partialRefundable' && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 3,
                }}
              >
                <Box>
                  <Typography
                    component="label"
                    htmlFor={refundPctId}
                    sx={{ ...LABEL_SX, color: refundPctError ? '#DC2626' : LABEL_SX.color }}
                  >
                    {t('manager.hotels.roomTypeManage.cancellationPolicy.refundPctLabel')}{' '}
                    <Typography component="span" sx={{ color: '#DC2626', fontWeight: 700 }}>
                      *
                    </Typography>
                  </Typography>
                  <OutlinedInput
                    id={refundPctId}
                    type="number"
                    value={refundPct}
                    onChange={(e) => {
                      setRefundPct(e.target.value);
                      if (refundPctError) setRefundPctError(false);
                    }}
                    error={refundPctError}
                    inputProps={{
                      min: 1,
                      max: 99,
                    }}
                    endAdornment={
                      <InputAdornment position="end">
                        <Typography
                          aria-hidden="true"
                          sx={{
                            fontWeight: 700,
                            color: tokens.text.muted,
                            fontSize: '0.9375rem',
                          }}
                        >
                          %
                        </Typography>
                      </InputAdornment>
                    }
                    sx={{
                      ...INPUT_SX,
                      ...(refundPctError && {
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DC2626' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B91C1C' },
                      }),
                    }}
                  />
                  {refundPctError && (
                    <Typography sx={{ fontSize: '0.8125rem', color: '#DC2626', mt: 0.75 }}>
                      {t('manager.hotels.roomTypeManage.cancellationPolicy.errorRefundPctRange')}
                    </Typography>
                  )}
                </Box>

                <Box>
                  <DatePicker
                    label={t('manager.hotels.roomTypeManage.cancellationPolicy.applyDateLabel')}
                    value={cancellationApplyDate}
                    onChange={setCancellationApplyDate}
                    slotProps={{
                      textField: {
                        id: 'cancellation-apply-date',
                        fullWidth: true,
                        inputProps: { 'aria-describedby': cancellationApplyHelperId },
                        sx: PICKER_TEXT_FIELD_SX,
                      },
                    }}
                  />
                  <Typography
                    id={cancellationApplyHelperId}
                    sx={{
                      fontSize: '0.8125rem',
                      color: tokens.text.muted,
                      mt: 1,
                      lineHeight: 1.5,
                    }}
                  >
                    {t('manager.hotels.roomTypeManage.cancellationPolicy.applyDateHelper')}
                  </Typography>
                </Box>
              </Box>
            )}
          </SectionCard>
        </Box>

        {/* ── Snackbar ── */}
        <Snackbar
          open={snackOpen}
          autoHideDuration={3500}
          onClose={() => setSnackOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackOpen(false)}
            severity={snackSeverity}
            variant="filled"
            sx={{ fontWeight: 600 }}
          >
            {snackMessage}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}
