'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Typography from '@mui/material/Typography';

import type { AmenitySummary } from '@/app/lib/types/catalog';

interface AmenityFilterProps {
  amenities: AmenitySummary[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function AmenityFilter({ amenities, selected, onChange }: AmenityFilterProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? amenities : amenities.slice(0, 4);

  const handleToggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Amenities
      </Typography>
      <FormGroup>
        {visible.map((a) => (
          <FormControlLabel
            key={a.code}
            control={
              <Checkbox
                checked={selected.includes(a.code)}
                onChange={() => handleToggle(a.code)}
                sx={{
                  '&.Mui-checked': { color: 'primary.main' },
                }}
              />
            }
            label={a.name}
          />
        ))}
      </FormGroup>
      {amenities.length > 4 && (
        <Button size="small" onClick={() => setShowAll(!showAll)} sx={{ textTransform: 'none', mt: 0.5 }}>
          {showAll ? 'Show less' : 'Show more'}
        </Button>
      )}
    </Box>
  );
}
