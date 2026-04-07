'use client';

import { useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { searchCities } from '@/app/lib/api/catalog';
import type { CityOut } from '@/app/lib/types/catalog';

export interface SearchBarProps {
  checkin: string;
  checkout: string;
  guests: number;
  onCheckinChange: (v: string) => void;
  onCheckoutChange: (v: string) => void;
  onGuestsChange: (v: number) => void;
  onSearch: (city: CityOut) => void;
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

function formatDateRange(checkin: string, checkout: string): string {
  const fmt = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  return `${fmt(checkin)} - ${fmt(checkout)}`;
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
  const [selected, setSelected] = useState<CityOut | null>(initialCity);
  const [inputValue, setInputValue] = useState(initialCity ? formatCity(initialCity) : '');
  const [options, setOptions] = useState<CityOut[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const [guestAnchor, setGuestAnchor] = useState<HTMLElement | null>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const guestRef = useRef<HTMLDivElement>(null);

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

  const handleSearch = () => {
    if (selected) onSearch(selected);
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
        <Box sx={{ flex: 1.2, display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, minWidth: 0 }}>
          <LocationOnOutlinedIcon sx={{ color: '#0EA5E9', fontSize: '1.5rem', flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={labelSx}>Where</Typography>
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
              noOptionsText={inputValue.trim().length < 2 ? 'Type at least 2 letters' : 'No cities found'}
              fullWidth
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search destination"
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
          sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, cursor: 'pointer' }}
        >
          <CalendarTodayOutlinedIcon sx={{ color: '#0EA5E9', fontSize: '1.5rem', flexShrink: 0 }} />
          <Box>
            <Typography sx={labelSx}>When</Typography>
            <Typography sx={valueSx}>{formatDateRange(checkin, checkout)}</Typography>
          </Box>
        </Box>

        <Popover
          open={Boolean(dateAnchor)}
          anchorEl={dateAnchor}
          onClose={() => setDateAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { sx: { borderRadius: 3, p: 3, mt: 1, display: 'flex', flexDirection: 'column', gap: 2 } } }}
        >
          <Typography sx={{ fontWeight: 600, color: 'grey.700' }}>Select dates</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker
              label="Check-in"
              value={toDate(checkin)}
              onChange={(d) => { const iso = toIso(d); if (iso) onCheckinChange(iso); }}
              disablePast
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker
              label="Check-out"
              value={toDate(checkout)}
              onChange={(d) => { const iso = toIso(d); if (iso) onCheckoutChange(iso); }}
              minDate={toDate(checkin)}
              slotProps={{ textField: { size: 'small' } }}
            />
          </Box>
        </Popover>

        <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />

        {/* WHO */}
        <Box
          ref={guestRef}
          onClick={() => setGuestAnchor(guestRef.current)}
          sx={{ flex: 0.7, display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, cursor: 'pointer' }}
        >
          <GroupOutlinedIcon sx={{ color: '#0EA5E9', fontSize: '1.5rem', flexShrink: 0 }} />
          <Box>
            <Typography sx={labelSx}>Who</Typography>
            <Typography sx={valueSx}>
              {guests} guest{guests !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>

        <Popover
          open={Boolean(guestAnchor)}
          anchorEl={guestAnchor}
          onClose={() => setGuestAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
          slotProps={{ paper: { sx: { borderRadius: 3, p: 3, mt: 1 } } }}
        >
          <Typography sx={{ fontWeight: 600, color: 'grey.700', mb: 1.5 }}>Guests</Typography>
          <TextField
            type="number"
            value={guests}
            onChange={(e) => onGuestsChange(Math.max(1, Math.min(20, Number(e.target.value))))}
            size="small"
            slotProps={{ input: { inputProps: { min: 1, max: 20 } } }}
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
            Search
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