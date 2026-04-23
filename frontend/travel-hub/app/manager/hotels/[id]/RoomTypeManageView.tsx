'use client';

import { useId, useState } from 'react';

import { tokens } from '@/lib/theme/tokens';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
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

import { type CancellationPolicyType, MOCK_ROOM_TYPE_DETAILS, type RoomTypeItem } from '../_data';

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

// ─── Main export ──────────────────────────────────────────────────────────────

export default function RoomTypeManageView({
  hotelName,
  roomType,
  onBack,
}: {
  hotelName: string;
  roomType: RoomTypeItem;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const discountId = useId();
  const refundPctId = useId();

  const defaults = MOCK_ROOM_TYPE_DETAILS[roomType.id] ?? {
    availabilityStart: new Date(),
    availabilityEnd: new Date(),
    discountPct: 0,
    cancellationPolicy: 'totallyRefundable' as CancellationPolicyType,
    refundPct: 100,
    cancellationApplyDate: new Date(),
  };

  const [availabilityStart, setAvailabilityStart] = useState<Date | null>(
    defaults.availabilityStart
  );
  const [availabilityEnd, setAvailabilityEnd] = useState<Date | null>(defaults.availabilityEnd);
  const [discountPct, setDiscountPct] = useState(String(defaults.discountPct));
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicyType>(
    defaults.cancellationPolicy
  );
  const [refundPct, setRefundPct] = useState(String(defaults.refundPct));
  const [cancellationApplyDate, setCancellationApplyDate] = useState<Date | null>(
    defaults.cancellationApplyDate
  );
  const [snackOpen, setSnackOpen] = useState(false);

  function handleSave() {
    setSnackOpen(true);
  }

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
            sx={{ display: 'flex', alignItems: 'center', mb: 2.5, flexWrap: 'wrap' }}
          >
            <Button
              onClick={onBack}
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
            <Button
              onClick={onBack}
              aria-label={hotelName}
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
              {t('manager.hotels.roomTypeManage.breadcrumbRoomTypes')}
            </Button>
            <NavigateNextIcon
              aria-hidden="true"
              sx={{ fontSize: 18, color: tokens.text.muted, mx: 0.25 }}
            />
            <Typography
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
              mb: 4,
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

            <Button
              variant="contained"
              startIcon={<SaveOutlinedIcon />}
              onClick={handleSave}
              aria-label={t('manager.hotels.roomTypeManage.saveChanges')}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.9375rem',
                bgcolor: tokens.brand.accentOrange,
                color: '#fff',
                borderRadius: 2.5,
                px: 3,
                py: 1.25,
                flexShrink: 0,
                '&:hover': {
                  bgcolor: tokens.brand.accentOrangeFg,
                },
                '&:focus-visible': {
                  outline: `2px solid ${tokens.brand.accentOrange}`,
                  outlineOffset: 3,
                },
              }}
            >
              {t('manager.hotels.roomTypeManage.saveChanges')}
            </Button>
          </Box>

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
                <Box>
                  <Typography
                    component="label"
                    htmlFor="availability-start"
                    sx={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: tokens.text.secondary,
                      mb: 1,
                    }}
                  >
                    {t('manager.hotels.roomTypeManage.availabilityPeriod.startLabel')}
                  </Typography>
                  <DateTimePicker
                    value={availabilityStart}
                    onChange={setAvailabilityStart}
                    slotProps={{
                      textField: {
                        id: 'availability-start',
                        inputProps: {
                          'aria-label': t(
                            'manager.hotels.roomTypeManage.availabilityPeriod.startLabel'
                          ),
                        },
                        sx: PICKER_TEXT_FIELD_SX,
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    component="label"
                    htmlFor="availability-end"
                    sx={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: tokens.text.secondary,
                      mb: 1,
                    }}
                  >
                    {t('manager.hotels.roomTypeManage.availabilityPeriod.endLabel')}
                  </Typography>
                  <DateTimePicker
                    value={availabilityEnd}
                    onChange={setAvailabilityEnd}
                    slotProps={{
                      textField: {
                        id: 'availability-end',
                        inputProps: {
                          'aria-label': t(
                            'manager.hotels.roomTypeManage.availabilityPeriod.endLabel'
                          ),
                        },
                        sx: PICKER_TEXT_FIELD_SX,
                      },
                    }}
                  />
                </Box>
              </Box>
            </SectionCard>

            {/* ── Pricing & Offers ── */}
            <SectionCard
              icon={<LocalOfferOutlinedIcon sx={{ fontSize: 20 }} />}
              titleKey="manager.hotels.roomTypeManage.pricingOffers.title"
              iconColor={tokens.brand.accentOrangeFg}
              iconBg={tokens.state.warningBg}
            >
              <Box sx={{ maxWidth: 320 }}>
                <Typography
                  component="label"
                  htmlFor={discountId}
                  sx={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: tokens.text.secondary,
                    mb: 1,
                  }}
                >
                  {t('manager.hotels.roomTypeManage.pricingOffers.discountLabel')}
                </Typography>
                <OutlinedInput
                  id={discountId}
                  type="number"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  inputProps={{
                    min: 0,
                    max: 100,
                    'aria-label': t('manager.hotels.roomTypeManage.pricingOffers.discountLabel'),
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
                    width: '100%',
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
                    '& input': { py: 1.25 },
                  }}
                />
                <Typography
                  sx={{ fontSize: '0.8125rem', color: tokens.text.muted, mt: 1, lineHeight: 1.5 }}
                >
                  {t('manager.hotels.roomTypeManage.pricingOffers.discountHelper')}
                </Typography>
              </Box>
            </SectionCard>

            {/* ── Cancellation Policy ── */}
            <SectionCard
              icon={<ShieldOutlinedIcon sx={{ fontSize: 20 }} />}
              titleKey="manager.hotels.roomTypeManage.cancellationPolicy.title"
              iconColor={tokens.brand.primaryOnLight}
              iconBg="#EFF6FF"
            >
              {/* Policy type label */}
              <Typography
                id="policy-type-label"
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: tokens.text.secondary,
                  mb: 1.5,
                }}
              >
                {t('manager.hotels.roomTypeManage.cancellationPolicy.policyTypeLabel')}
              </Typography>

              {/* Policy radio cards */}
              <Box
                role="radiogroup"
                aria-labelledby="policy-type-label"
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
                      htmlFor={`policy-${type}`}
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
                          inputProps={{
                            'aria-label': t(labelKey),
                          }}
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

              {/* Conditional fields for Partial Refundable */}
              {cancellationPolicy === 'partialRefundable' && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 3,
                  }}
                >
                  {/* Refund Percentage */}
                  <Box>
                    <Typography
                      component="label"
                      htmlFor={refundPctId}
                      sx={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: tokens.text.secondary,
                        mb: 1,
                      }}
                    >
                      {t('manager.hotels.roomTypeManage.cancellationPolicy.refundPctLabel')}
                    </Typography>
                    <OutlinedInput
                      id={refundPctId}
                      type="number"
                      value={refundPct}
                      onChange={(e) => setRefundPct(e.target.value)}
                      inputProps={{
                        min: 0,
                        max: 100,
                        'aria-label': t(
                          'manager.hotels.roomTypeManage.cancellationPolicy.refundPctLabel'
                        ),
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
                        width: '100%',
                        bgcolor: tokens.surface.pageCool,
                        borderRadius: 2,
                        fontSize: '0.9375rem',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: tokens.border.default,
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: tokens.border.subtleHover,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: tokens.brand.accentOrange,
                        },
                        '& input': { py: 1.25 },
                      }}
                    />
                  </Box>

                  {/* Cancellation Apply Date */}
                  <Box>
                    <Typography
                      component="label"
                      htmlFor="cancellation-apply-date"
                      sx={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: tokens.text.secondary,
                        mb: 1,
                      }}
                    >
                      {t('manager.hotels.roomTypeManage.cancellationPolicy.applyDateLabel')}
                    </Typography>
                    <DatePicker
                      value={cancellationApplyDate}
                      onChange={setCancellationApplyDate}
                      slotProps={{
                        textField: {
                          id: 'cancellation-apply-date',
                          inputProps: {
                            'aria-label': t(
                              'manager.hotels.roomTypeManage.cancellationPolicy.applyDateLabel'
                            ),
                          },
                          sx: PICKER_TEXT_FIELD_SX,
                        },
                      }}
                    />
                    <Typography
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
        </Container>

        {/* ── Success snackbar ── */}
        <Snackbar
          open={snackOpen}
          autoHideDuration={3500}
          onClose={() => setSnackOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackOpen(false)}
            severity="success"
            variant="filled"
            sx={{ fontWeight: 600 }}
          >
            {t('manager.hotels.roomTypeManage.savedSuccess')}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}
