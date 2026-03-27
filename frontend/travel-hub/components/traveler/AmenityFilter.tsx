import React from 'react';
import { Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material';
import type { AmenitySummary } from '@/app/lib/types/catalog';

interface AmenityFilterProps {
  amenities: AmenitySummary[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function AmenityFilter({ amenities, selected, onChange }: AmenityFilterProps) {
  const handleToggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div>
      <Typography variant="subtitle1" gutterBottom>
        Amenidades
      </Typography>
      <FormGroup>
        {amenities.map((a) => (
          <FormControlLabel
            key={a.code}
            control={
              <Checkbox
                checked={selected.includes(a.code)}
                onChange={() => handleToggle(a.code)}
              />
            }
            label={a.name}
          />
        ))}
      </FormGroup>
    </div>
  );
}
