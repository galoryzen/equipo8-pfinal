'use client';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function UnauthorizedDashboard(): React.ReactNode {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 560,
          borderRadius: 3,
          boxShadow: 'none',
          border: '1px solid #E2E8F0',
        }}
      >
        <CardContent sx={{ py: 5 }}>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: '#FEF3C7',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LockOutlinedIcon />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
              {t('manager.dashboard.errors.unauthorizedTitle')}
            </Typography>

            <Typography sx={{ color: '#64748B', maxWidth: 420 }}>
              {t('manager.dashboard.errors.unauthorized')}
            </Typography>

            <Button type="button" variant="outlined" sx={{ mt: 1, textTransform: 'none' }}>
              {t('manager.dashboard.actions.goToBookings')}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
