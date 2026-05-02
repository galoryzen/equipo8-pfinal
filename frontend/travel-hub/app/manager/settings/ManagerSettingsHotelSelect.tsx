'use client';

import { tokens } from '@/lib/theme/tokens';
import { MenuItem, Select, Stack, Typography } from '@mui/material';

export type ManagerSettingsHotelOption = {
  id: string;
  name: string;
};

export type ManagerSettingsHotelSelectProps = {
  hotels: ManagerSettingsHotelOption[];
  value: string | null;
  sectionLabel: string;
  selectAriaLabel: string;
  onHotelChange: (hotelId: string) => void;
};

export function ManagerSettingsHotelSelect({
  hotels,
  value,
  sectionLabel,
  selectAriaLabel,
  onHotelChange,
}: ManagerSettingsHotelSelectProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ sm: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 800, color: tokens.text.secondary }}>
        {sectionLabel}
      </Typography>
      <Select
        size="small"
        value={value ?? ''}
        displayEmpty
        inputProps={{ 'aria-label': selectAriaLabel }}
        onChange={(e) => {
          const nextId = String(e.target.value || '');
          if (!nextId) return;
          onHotelChange(nextId);
        }}
        sx={{
          minWidth: { xs: '100%', sm: 320 },
          bgcolor: tokens.surface.paper,
          borderRadius: 2,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.border.default },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: tokens.border.subtleHover,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: tokens.brand.accentOrange,
          },
        }}
      >
        {hotels.map((h) => (
          <MenuItem key={h.id} value={h.id}>
            {h.name}
          </MenuItem>
        ))}
      </Select>
    </Stack>
  );
}
