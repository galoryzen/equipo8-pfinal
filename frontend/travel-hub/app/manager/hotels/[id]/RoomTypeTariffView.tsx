'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  addSeasonalTariff,
  deleteSeasonalTariff,
  getRoomTariffs,
  updateBaseTariff,
} from '@/app/lib/api/manager';
import { type RoomTariffs, type RoomTypeManagerItem } from '@/app/lib/types/manager';
import { tokens } from '@/lib/theme/tokens';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useTranslation } from 'react-i18next';

function toDateStr(d: Date | null): string {
  if (!d) return '';
  return d.toISOString().split('T')[0];
}

function SectionCard({
  icon,
  title,
  iconColor,
  iconBg,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  iconColor: string;
  iconBg: string;
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
          {title}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

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

const LABEL_SX = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 700,
  color: tokens.text.secondary,
  mb: 1,
};

export default function RoomTypeTariffView({
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
  const [tariffs, setTariffs] = useState<RoomTariffs | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBase, setSavingBase] = useState(false);
  const [addingRule, setAddingRule] = useState(false);

  // Base Tariff form
  const [basePrice, setBasePrice] = useState('0');
  const [weekendPremium, setWeekendPremium] = useState('0');

  // New Rule form
  const [ruleName, setRuleName] = useState('');
  const [ruleStart, setRuleStart] = useState<Date | null>(new Date());
  const [ruleEnd, setRuleEnd] = useState<Date | null>(new Date());
  const [ruleType, setRuleType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [ruleValue, setRuleValue] = useState('0');

  // Feedback
  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadTariffs = useCallback(async () => {
    try {
      const data = await getRoomTariffs(roomType.id);
      setTariffs(data);
      if (data.base) {
        setBasePrice(String(data.base.base_price));
        setWeekendPremium(String(data.base.weekend_premium));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [roomType.id]);

  useEffect(() => {
    void loadTariffs();
  }, [loadTariffs]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleSaveBase() {
    setSavingBase(true);
    try {
      await updateBaseTariff(roomType.id, {
        base_price: parseFloat(basePrice),
        weekend_premium: parseFloat(weekendPremium),
      });
      setSnack({
        open: true,
        message: t('manager.hotels.roomTypeManage.tariffSavedSuccess'),
        severity: 'success',
      });
      await loadTariffs();
    } catch {
      setSnack({
        open: true,
        message: t('manager.hotels.roomTypeManage.tariffError'),
        severity: 'error',
      });
    } finally {
      setSavingBase(false);
    }
  }

  async function handleAddRule() {
    if (!ruleName || !ruleStart || !ruleEnd) {
      setSnack({
        open: true,
        message: t('manager.hotels.roomTypeManage.fillAllFields'),
        severity: 'error',
      });
      return;
    }
    setAddingRule(true);
    try {
      await addSeasonalTariff(roomType.id, {
        name: ruleName,
        start_date: toDateStr(ruleStart),
        end_date: toDateStr(ruleEnd),
        adjustment_type: ruleType,
        adjustment_value: parseFloat(ruleValue),
      });
      setSnack({
        open: true,
        message: t('manager.hotels.roomTypeManage.ruleAddedSuccess'),
        severity: 'success',
      });
      setRuleName('');
      await loadTariffs();
    } catch {
      setSnack({
        open: true,
        message: t('manager.hotels.roomTypeManage.ruleAddError'),
        severity: 'error',
      });
    } finally {
      setAddingRule(false);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    try {
      await deleteSeasonalTariff(ruleId);
      setSnack({
        open: true,
        message: t('manager.hotels.roomTypeManage.ruleDeletedSuccess'),
        severity: 'success',
      });
      await loadTariffs();
    } catch {
      setSnack({
        open: true,
        message: t('manager.hotels.roomTypeManage.ruleDeleteError'),
        severity: 'error',
      });
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress sx={{ color: tokens.brand.accentOrange }} />
      </Box>
    );
  }

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
        <Box component="nav" sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
          <Button
            onClick={onBack}
            aria-label={t('manager.hotels.backToHotels')}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: tokens.text.secondary,
              p: 0,
              minWidth: 'auto',
              '&:hover': { bgcolor: 'transparent', color: tokens.text.primary },
            }}
          >
            {t('manager.hotels.title')}
          </Button>
          <NavigateNextIcon sx={{ fontSize: 18, color: tokens.text.muted, mx: 0.25 }} />
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
            }}
          >
            {hotelName}
          </Button>
          <NavigateNextIcon sx={{ fontSize: 18, color: tokens.text.muted, mx: 0.25 }} />
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: tokens.text.primary }}>
            {roomType.name} {t('manager.hotels.roomTypeManage.tariffTitle')}
          </Typography>
        </Box>

        {/* ── Header ── */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: tokens.text.primary }}>
              {t('manager.hotels.roomTypeManage.tariffTitle')}
            </Typography>
            <Typography sx={{ color: tokens.text.secondary }}>
              {t('manager.hotels.roomTypeManage.tariffSubtitle', { name: roomType.name })}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={
              savingBase ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />
            }
            onClick={handleSaveBase}
            disabled={savingBase}
            aria-label={t('manager.hotels.roomTypeManage.saveBaseTariff')}
            sx={{
              bgcolor: tokens.brand.accentOrangeSoft,
              color: tokens.brand.accentOrangeFg,
              '&:hover': {
                bgcolor: tokens.brand.accentOrange,
                color: 'white',
              },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
            }}
          >
            {t('manager.hotels.roomTypeManage.saveBaseTariff')}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* ── Section 1: Base Tariff ── */}
          <SectionCard
            icon={<TrendingUpIcon />}
            title={t('manager.hotels.roomTypeManage.baseTariff')}
            iconColor={tokens.brand.accentOrange}
            iconBg={tokens.state.warningBg}
          >
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}
            >
              <Box>
                <Typography component="label" htmlFor="base-price-input" sx={LABEL_SX}>
                  {t('manager.hotels.roomTypeManage.basePrice')}
                </Typography>
                <OutlinedInput
                  id="base-price-input"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  type="number"
                  startAdornment={<InputAdornment position="start">$</InputAdornment>}
                  sx={INPUT_SX}
                  aria-label={t('manager.hotels.roomTypeManage.basePrice')}
                />
              </Box>
              <Box>
                <Typography component="label" htmlFor="weekend-premium-input" sx={LABEL_SX}>
                  {t('manager.hotels.roomTypeManage.weekendPremium')}
                </Typography>
                <OutlinedInput
                  id="weekend-premium-input"
                  value={weekendPremium}
                  onChange={(e) => setWeekendPremium(e.target.value)}
                  type="number"
                  endAdornment={<InputAdornment position="end">%</InputAdornment>}
                  sx={INPUT_SX}
                  aria-label={t('manager.hotels.roomTypeManage.weekendPremium')}
                />
                <Typography sx={{ fontSize: '0.75rem', color: tokens.text.muted, mt: 0.5 }}>
                  {t('manager.hotels.roomTypeManage.weekendPremiumHint')}
                </Typography>
              </Box>
            </Box>
          </SectionCard>

          {/* ── Section 2: Seasonal Rules ── */}
          <SectionCard
            icon={<CalendarTodayOutlinedIcon />}
            title={t('manager.hotels.roomTypeManage.seasonalAdjustments')}
            iconColor={tokens.brand.primary}
            iconBg="#EFF6FF"
          >
            {/* Rule List */}
            {tariffs?.seasonal_rules && tariffs.seasonal_rules.length > 0 && (
              <Box
                sx={{
                  mb: 4,
                  border: `1px solid ${tokens.border.subtle}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 2fr 1fr 1fr 48px',
                    bgcolor: tokens.surface.muted,
                    p: 1.5,
                    borderBottom: `1px solid ${tokens.border.subtle}`,
                  }}
                >
                  <Typography
                    sx={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}
                  >
                    {t('manager.hotels.roomTypeManage.ruleNameHeader')}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}
                  >
                    {t('manager.hotels.roomTypeManage.rulePeriodHeader')}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}
                  >
                    {t('manager.hotels.roomTypeManage.ruleTypeHeader')}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}
                  >
                    {t('manager.hotels.roomTypeManage.ruleValueHeader')}
                  </Typography>
                  <Box />
                </Box>
                {tariffs.seasonal_rules.map((rule) => (
                  <Box
                    key={rule.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 2fr 1fr 1fr 48px',
                      p: 1.5,
                      alignItems: 'center',
                      borderBottom: `1px solid ${tokens.border.subtle}`,
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Typography sx={{ fontWeight: 600 }}>{rule.name}</Typography>
                    <Typography sx={{ fontSize: '0.875rem' }}>
                      {rule.start_date} to {rule.end_date}
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem' }}>{rule.adjustment_type}</Typography>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>
                      {rule.adjustment_type === 'PERCENT'
                        ? `+${rule.adjustment_value}%`
                        : `+$${rule.adjustment_value}`}
                    </Typography>
                    <IconButton
                      onClick={() => handleDeleteRule(rule.id)}
                      size="small"
                      sx={{ color: tokens.state.errorFg }}
                      aria-label={t('manager.hotels.roomTypeManage.deleteRuleTitle', {
                        name: rule.name,
                      })}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {/* Add Rule Form */}
            <Typography sx={{ ...LABEL_SX, mb: 2 }}>
              {t('manager.hotels.roomTypeManage.addRule')}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '2fr 1.5fr 1.5fr 1fr 1fr auto' },
                gap: 2,
                alignItems: 'flex-end',
              }}
            >
              <Box>
                <Typography
                  component="label"
                  htmlFor="rule-name-input"
                  variant="caption"
                  sx={LABEL_SX}
                >
                  {t('manager.hotels.roomTypeManage.ruleName')}
                </Typography>
                <OutlinedInput
                  id="rule-name-input"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder={t('manager.hotels.roomTypeManage.ruleNamePlaceholder')}
                  sx={INPUT_SX}
                />
              </Box>
              <Box>
                <Typography
                  component="label"
                  htmlFor="rule-start-date"
                  variant="caption"
                  sx={LABEL_SX}
                >
                  {t('manager.hotels.roomTypeManage.ruleStart')}
                </Typography>
                <DatePicker
                  label={t('manager.hotels.roomTypeManage.ruleStart')}
                  value={ruleStart}
                  onChange={setRuleStart}
                  slotProps={{ textField: { sx: PICKER_TEXT_FIELD_SX } }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={LABEL_SX}>
                  {t('manager.hotels.roomTypeManage.ruleEnd')}
                </Typography>
                <Typography
                  component="label"
                  htmlFor="rule-end-date"
                  variant="caption"
                  sx={LABEL_SX}
                >
                  {t('manager.hotels.roomTypeManage.ruleEnd')}
                </Typography>
                <DatePicker
                  label={t('manager.hotels.roomTypeManage.ruleEnd')}
                  value={ruleEnd}
                  onChange={setRuleEnd}
                  slotProps={{ textField: { sx: PICKER_TEXT_FIELD_SX } }}
                />
              </Box>
              <Box>
                <Typography
                  component="label"
                  htmlFor="rule-type-select"
                  variant="caption"
                  sx={LABEL_SX}
                >
                  {t('manager.hotels.roomTypeManage.ruleType')}
                </Typography>
                <Select
                  id="rule-type-select"
                  label={t('manager.hotels.roomTypeManage.ruleType')}
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as 'PERCENT' | 'FIXED')}
                  sx={INPUT_SX}
                  title={t('manager.hotels.roomTypeManage.ruleType')}
                >
                  <MenuItem value="PERCENT">
                    {t('manager.hotels.roomTypeManage.ruleTypePercent')}
                  </MenuItem>
                  <MenuItem value="FIXED">
                    {t('manager.hotels.roomTypeManage.ruleTypeFixed')}
                  </MenuItem>
                </Select>
              </Box>
              <Box>
                <Typography
                  component="label"
                  htmlFor="rule-value-input"
                  variant="caption"
                  sx={LABEL_SX}
                >
                  {t('manager.hotels.roomTypeManage.ruleValue')}
                </Typography>
                <OutlinedInput
                  id="rule-value-input"
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  type="number"
                  sx={INPUT_SX}
                  aria-label={t('manager.hotels.roomTypeManage.ruleValue')}
                />
              </Box>
              <Button
                variant="contained"
                onClick={handleAddRule}
                disabled={addingRule}
                aria-label={t('manager.hotels.roomTypeManage.addRuleButton')}
                sx={{
                  minWidth: 48,
                  height: 48,
                  bgcolor: tokens.brand.primary,
                  borderRadius: 2,
                  '&:hover': { bgcolor: tokens.brand.primaryOnLight },
                }}
              >
                {addingRule ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
              </Button>
            </Box>
          </SectionCard>
        </Box>

        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={() => setSnack({ ...snack, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snack.severity} sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}>
            {snack.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}
