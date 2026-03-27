'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import SearchIcon from '@mui/icons-material/Search';
import Typography from '@mui/material/Typography';

interface SearchBarProps {
  initialCity?: string;
  initialCheckin?: string;
  initialCheckout?: string;
  initialGuests?: number;
  onSearch: (city: string, checkin: string, checkout: string, guests: number) => void;
}

export default function SearchBar({
  initialCity = '',
  initialCheckin = '',
  initialCheckout = '',
  initialGuests = 2,
  onSearch,
}: SearchBarProps) {
  const [city, setCity] = useState(initialCity);
  const [checkin, setCheckin] = useState(initialCheckin);
  const [checkout, setCheckout] = useState(initialCheckout);
  const [guests, setGuests] = useState(initialGuests);

  const handleSubmit = () => {
    onSearch(city, checkin, checkout, guests);
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
        maxWidth: 700,
        mx: 'auto',
        border: '1px solid',
        borderColor: 'grey.200',
      }}
    >
      {/* WHERE */}
      <Box sx={{ flex: 1, px: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'grey.500', textTransform: 'uppercase', fontSize: '0.625rem', letterSpacing: 1 }}>
          Where
        </Typography>
        <InputBase
          placeholder="Search destination"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          fullWidth
          sx={{ fontSize: '0.875rem' }}
        />
      </Box>

      <Divider orientation="vertical" flexItem sx={{ my: 1 }} />

      {/* WHEN */}
      <Box sx={{ flex: 1, px: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'grey.500', textTransform: 'uppercase', fontSize: '0.625rem', letterSpacing: 1 }}>
          When
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <InputBase
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            sx={{ fontSize: '0.875rem', flex: 1 }}
          />
          <Typography color="text.secondary" variant="body2">-</Typography>
          <InputBase
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            sx={{ fontSize: '0.875rem', flex: 1 }}
          />
        </Box>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ my: 1 }} />

      {/* WHO */}
      <Box sx={{ flex: 1, px: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'grey.500', textTransform: 'uppercase', fontSize: '0.625rem', letterSpacing: 1 }}>
          Who
        </Typography>
        <InputBase
          type="number"
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          inputProps={{ min: 1, max: 20 }}
          fullWidth
          sx={{ fontSize: '0.875rem' }}
        />
      </Box>

      {/* Search button */}
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
