'use client';

import NextLink from 'next/link';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

export default function TripsEmptyState() {
  const { t } = useTranslation();

  return (
    <Box
      data-testid="trips-empty-state"
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
        {t('tripsEmptyState.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 420, mx: 'auto' }}>
        {t('tripsEmptyState.description')}
      </Typography>
      <Button
        component={NextLink}
        href="/traveler/search"
        variant="contained"
        sx={{ textTransform: 'none' }}
      >
        {t('tripsEmptyState.cta')}
      </Button>
    </Box>
  );
}
