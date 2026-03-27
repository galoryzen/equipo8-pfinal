'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

interface PriceRangeFilterProps {
  minPrice?: number;
  maxPrice?: number;
  onApply: (min: number | undefined, max: number | undefined) => void;
}

export default function PriceRangeFilter({ minPrice, maxPrice, onApply }: PriceRangeFilterProps) {
  const [range, setRange] = useState<[number, number]>([minPrice ?? 0, maxPrice ?? 1000]);
  const [error, setError] = useState<string | null>(null);

  const handleSliderChange = (_: Event, value: number | number[]) => {
    const [min, max] = value as number[];
    setRange([min, max]);
    setError(null);
  };

  const handleSliderChangeCommitted = () => {
    if (range[0] <= range[1]) {
      onApply(range[0] || undefined, range[1] || undefined);
    }
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val >= 0) {
      setRange([val, range[1]]);
      setError(null);
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val >= 0) {
      setRange([range[0], val]);
      setError(null);
    }
  };

  const handleBlur = () => {
    if (range[0] > range[1]) {
      setError('Min cannot be greater than max');
      return;
    }
    setError(null);
    onApply(range[0] || undefined, range[1] || undefined);
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Price range
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Nightly prices before fees and taxes
      </Typography>
      <Slider
        value={range}
        onChange={handleSliderChange}
        onChangeCommitted={handleSliderChangeCommitted}
        valueLabelDisplay="auto"
        min={0}
        max={2000}
        step={10}
        sx={{
          color: 'primary.main',
          '& .MuiSlider-thumb': {
            width: 20,
            height: 20,
            bgcolor: 'white',
            border: '3px solid',
            borderColor: 'primary.main',
          },
          '& .MuiSlider-track': { height: 4 },
          '& .MuiSlider-rail': { height: 4, bgcolor: '#e2e8f0' },
        }}
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <TextField
          label="Min"
          type="number"
          size="small"
          value={range[0]}
          onChange={handleMinChange}
          onBlur={handleBlur}
          inputProps={{ min: 0 }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            },
          }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Max"
          type="number"
          size="small"
          value={range[1]}
          onChange={handleMaxChange}
          onBlur={handleBlur}
          inputProps={{ min: 0 }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              endAdornment: range[1] >= 2000 ? (
                <InputAdornment position="end">+</InputAdornment>
              ) : null,
            },
          }}
          sx={{ flex: 1 }}
        />
      </Box>
      {error && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
