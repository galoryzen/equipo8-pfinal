'use client';

import { useEffect, useRef, useState } from 'react';

import { searchCities } from '@/app/lib/api/catalog';
import type { CityOut } from '@/app/lib/types/catalog';
import { dateFormattingLocale } from '@/lib/i18n/dateLocale';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useTranslation } from 'react-i18next';

export interface SearchBarProps {
  checkin: string;
  checkout: string;
  guests: number;
  onCheckinChange: (v: string) => void;
  onCheckoutChange: (v: string) => void;
  onGuestsChange: (v: number) => void;
  onSearch: (city: CityOut | null) => void;
  initialCity?: CityOut | null;
  variant?: 'button' | 'icon';
}

function formatCity(c: CityOut) {
  const dept = c.department ? `, ${c.department}` : '';
  return `${c.name}${dept} — ${c.country}`;
}

function toDate(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

function toIso(date: Date | null): string | null {
  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function formatDateRange(checkin: string, checkout: string, locale: string): string {
  const fmt = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };
  return `${fmt(checkin)} - ${fmt(checkout)}`;
}

function parseGuestsCommit(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return 1;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, n);
}

const labelSx = {
  fontSize: '0.625rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#0EA5E9',
  lineHeight: 1,
  mb: 0.5,
} as const;

const valueSx = {
  fontSize: '1rem',
  fontWeight: 500,
  color: 'text.primary',
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
} as const;

export default function SearchBar({
  checkin,
  checkout,
  guests,
  onCheckinChange,
  onCheckoutChange,
  onGuestsChange,
  onSearch,
  initialCity = null,
  variant = 'button',
}: SearchBarProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = dateFormattingLocale(i18n.language);
  const [selected, setSelected] = useState<CityOut | null>(initialCity);
  const [inputValue, setInputValue] = useState(initialCity ? formatCity(initialCity) : '');
  const [options, setOptions] = useState<CityOut[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const [guestAnchor, setGuestAnchor] = useState<HTMLElement | null>(null);
  const [guestInput, setGuestInput] = useState(() => String(guests));
  const dateRef = useRef<HTMLDivElement>(null);
  const guestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGuestInput(String(guests));
  }, [guests]);

  useEffect(() => {
    if (initialCity) {
      setSelected(initialCity);
      setInputValue(formatCity(initialCity));
    }
  }, [initialCity]);

  useEffect(() => {
    if (inputValue.trim().length < 2) {
      setOptions([]);
      return;
    }
    if (selected && inputValue === formatCity(selected)) return;

    let cancelled = false;
    setLoadingCities(true);
    const t = window.setTimeout(async () => {
      try {
        const list = await searchCities(inputValue.trim());
        if (!cancelled) setOptions(list);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [inputValue, selected]);

  const commitGuests = () => {
    const n = parseGuestsCommit(guestInput);
    onGuestsChange(n);
    setGuestInput(String(n));
  };

  const handleSearch = () => {
    if (!selected) return;
    commitGuests();
    onSearch(selected);
  };

  const closeGuestPopover = () => {
    commitGuests();
    setGuestAnchor(null);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: '999px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          border: '1px solid',
          borderColor: 'grey.200',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          px: { xs: 2, md: 1 },
          py: { xs: 1, md: 0.5 },
        }}
      >
        {/* WHERE */}
        <Box
          sx={{
            flex: 1.2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.5,
            minWidth: 0,
          }}
        >
          <LocationOnOutlinedIcon sx={{ color: '#0EA5E9', fontSize: '1.5rem', flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={labelSx}>{t('search.where')}</Typography>
            <Autocomplete
              options={options}
              loading={loadingCities}
              getOptionLabel={(o) => formatCity(o)}
              value={selected}
              onChange={(_, v) => setSelected(v)}
              inputValue={inputValue}
              onInputChange={(_, v, reason) => {
                setInputValue(v);
                if (reason === 'input' || reason === 'clear') setSelected(null);
              }}
              filterOptions={(x) => x}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText={
                inputValue.trim().length < 2 ? t('search.typeTwoChars') : t('search.noCities')
              }
              fullWidth
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={t('search.searchDestination')}
                  variant="standard"
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      disableUnderline: true,
                      endAdornment: (
                        <>
                          {loadingCities ? <CircularProgress color="inherit" size={14} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      ...valueSx,
                      p: 0,
                    },
                  }}
                />
              )}
            />
          </Box>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />

        {/* WHEN */}
        <Box
          ref={dateRef}
          onClick={() => setDateAnchor(dateRef.current)}
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.5,
            cursor: 'pointer',
          }}
        >
          <CalendarTodayOutlinedIcon sx={{ color: '#0EA5E9', fontSize: '1.5rem', flexShrink: 0 }} />
          <Box>
            <Typography sx={labelSx}>{t('search.when')}</Typography>
            <Typography sx={valueSx}>{formatDateRange(checkin, checkout, dateLocale)}</Typography>
          </Box>
        </Box>

        <Popover
          open={Boolean(dateAnchor)}
          anchorEl={dateAnchor}
          onClose={() => setDateAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: 3,
                p: 3,
                mt: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              },
            },
          }}
        >
          <Typography sx={{ fontWeight: 600, color: 'grey.700' }}>
            {t('search.selectDates')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker
              label={t('search.checkIn')}
              value={toDate(checkin)}
              onChange={(d) => {
                const iso = toIso(d);
                if (iso) onCheckinChange(iso);
              }}
              disablePast
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker
              label={t('search.checkOut')}
              value={toDate(checkout)}
              onChange={(d) => {
                const iso = toIso(d);
                if (iso) onCheckoutChange(iso);
              }}
              minDate={toDate(checkin)}
              slotProps={{ textField: { size: 'small' } }}
            />
          </Box>
        </Popover>

        <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />

        {/* WHO */}
        <Box
          ref={guestRef}
          onClick={() => {
            setGuestInput(String(guests));
            setGuestAnchor(guestRef.current);
          }}
          sx={{
            flex: 0.7,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.5,
            cursor: 'pointer',
          }}
        >
          <GroupOutlinedIcon sx={{ color: '#0EA5E9', fontSize: '1.5rem', flexShrink: 0 }} />
          <Box>
            <Typography sx={labelSx}>{t('search.who')}</Typography>
            <Typography sx={valueSx}>{t('search.guestsCount', { count: guests })}</Typography>
          </Box>
        </Box>

        <Popover
          open={Boolean(guestAnchor)}
          anchorEl={guestAnchor}
          onClose={closeGuestPopover}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
          slotProps={{ paper: { sx: { borderRadius: 3, p: 3, mt: 1 } } }}
        >
          <Typography sx={{ fontWeight: 600, color: 'grey.700', mb: 1.5 }}>
            {t('search.guests')}
          </Typography>
          <TextField
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={guestInput}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d+$/.test(v)) setGuestInput(v);
            }}
            onBlur={commitGuests}
            placeholder="1"
            size="small"
            sx={{ minWidth: 120 }}
            helperText={t('search.guestsMinHelper')}
          />
        </Popover>

        {/* Search button */}
        {variant === 'button' ? (
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={!selected}
            startIcon={<SearchIcon />}
            sx={{
              bgcolor: '#0EA5E9',
              borderRadius: '999px',
              px: 4,
              py: 1.5,
              mr: 0.5,
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              boxShadow: 1,
              '&:hover': { bgcolor: '#0284C7' },
              '&.Mui-disabled': { bgcolor: 'grey.300', color: 'white' },
            }}
          >
            {t('search.search')}
          </Button>
        ) : (
          <IconButton
            onClick={handleSearch}
            disabled={!selected}
            sx={{
              bgcolor: '#0EA5E9',
              color: 'white',
              mr: 0.5,
              width: 48,
              height: 48,
              '&:hover': { bgcolor: '#0284C7' },
              '&.Mui-disabled': { bgcolor: 'grey.300', color: 'white' },
            }}
          >
            <SearchIcon />
          </IconButton>
        )}
      </Box>
    </LocalizationProvider>
  );
}
