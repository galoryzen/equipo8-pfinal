'use client';

import { useEffect, useState } from 'react';

import { searchCities } from '@/app/lib/api/catalog';
import type { CityOut } from '@/app/lib/types/catalog';
import SearchIcon from '@mui/icons-material/Search';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

export interface SearchBarProps {
  initialCityLabel?: string;
  checkin: string;
  checkout: string;
  guests: number;
  onCheckinChange: (v: string) => void;
  onCheckoutChange: (v: string) => void;
  onGuestsChange: (v: number) => void;
  /** Called when the user clicks Search. Pick a city from the list to search that destination; otherwise browse mode uses featured stays. */
  onSearch: (cityId: string | null, cityLabel: string) => void;
}

function formatCity(c: CityOut) {
  const dept = c.department ? `, ${c.department}` : '';
  return `${c.name}${dept} — ${c.country}`;
}

export default function SearchBar({
  initialCityLabel = '',
  checkin,
  checkout,
  guests,
  onCheckinChange,
  onCheckoutChange,
  onGuestsChange,
  onSearch,
}: SearchBarProps) {
  const [selected, setSelected] = useState<CityOut | null>(null);
  const [inputValue, setInputValue] = useState(initialCityLabel);
  const [options, setOptions] = useState<CityOut[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    setInputValue(initialCityLabel);
  }, [initialCityLabel]);

  useEffect(() => {
    if (inputValue.trim().length < 2) {
      setOptions([]);
      return;
    }
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
  }, [inputValue]);

  const handleSubmit = () => {
    const label = selected?.name ?? inputValue.trim();
    const id = selected?.id ?? null;
    onSearch(id, label);
  };

  return (
    <Paper
      elevation={1}
      sx={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: '50px',
        px: 1,
        py: 1,
        maxWidth: 900,
        mx: 'auto',
        border: '1px solid',
        borderColor: 'grey.200',
      }}
    >
      <Box sx={{ flex: 1.2, px: 2, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: 'grey.500',
            textTransform: 'uppercase',
            fontSize: '0.625rem',
            letterSpacing: 1,
          }}
        >
          Where
        </Typography>
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
            inputValue.trim().length < 2 ? 'Type at least 2 letters' : 'No cities found'
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search destination"
              variant="standard"
              InputProps={{
                ...params.InputProps,
                disableUnderline: true,
                endAdornment: (
                  <>
                    {loadingCities ? <CircularProgress color="inherit" size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem', py: 0.5 } }}
            />
          )}
          sx={{ pt: 0.5 }}
        />
      </Box>

      <Divider orientation="vertical" flexItem sx={{ my: 1 }} />

      <Box sx={{ flex: 1, px: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: 'grey.500',
            textTransform: 'uppercase',
            fontSize: '0.625rem',
            letterSpacing: 1,
          }}
        >
          When
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <InputBase
            type="date"
            value={checkin}
            onChange={(e) => onCheckinChange(e.target.value)}
            sx={{ fontSize: '0.875rem', flex: 1 }}
          />
          <Typography color="text.secondary" variant="body2">
            -
          </Typography>
          <InputBase
            type="date"
            value={checkout}
            onChange={(e) => onCheckoutChange(e.target.value)}
            sx={{ fontSize: '0.875rem', flex: 1 }}
          />
        </Box>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ my: 1 }} />

      <Box sx={{ flex: 0.8, px: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: 'grey.500',
            textTransform: 'uppercase',
            fontSize: '0.625rem',
            letterSpacing: 1,
          }}
        >
          Who
        </Typography>
        <InputBase
          type="number"
          value={guests}
          onChange={(e) => onGuestsChange(Number(e.target.value))}
          inputProps={{ min: 1, max: 20 }}
          fullWidth
          sx={{ fontSize: '0.875rem' }}
        />
      </Box>

      <IconButton
        onClick={handleSubmit}
        aria-label="Search"
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          width: 48,
          height: 48,
          ml: 1,
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        <SearchIcon />
      </IconButton>
    </Paper>
  );
}
