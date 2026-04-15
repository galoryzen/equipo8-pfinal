'use client';

import NextLink from 'next/link';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export default function TripsEmptyState() {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        px: 2,
        border: '1px dashed',
        borderColor: 'grey.300',
        borderRadius: 2,
        bgcolor: 'grey.50',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        No tienes reservas registradas
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 420, mx: 'auto' }}>
        Cuando reserves un alojamiento, aparecerá aquí con el estado y las fechas de tu viaje.
      </Typography>
      <Button
        component={NextLink}
        href="/traveler/search"
        variant="contained"
        sx={{ textTransform: 'none' }}
      >
        Buscar hoteles
      </Button>
    </Box>
  );
}
