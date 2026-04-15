'use client';

import { useState } from 'react';

import FlightIcon from '@mui/icons-material/Flight';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

export default function NewsletterSection() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');

  return (
    <Box
      sx={{
        bgcolor: 'grey.100',
        borderRadius: 6,
        p: { xs: 3, md: 6 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {/* Left content */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="h2"
          sx={{ fontWeight: 700, fontSize: '1.875rem', color: 'grey.900', mb: 2 }}
        >
          {t('newsletter.title')}
        </Typography>
        <Typography sx={{ fontSize: '1rem', color: 'grey.500', mb: 2 }}>
          {t('newsletter.body')}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            pt: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'stretch',
          }}
        >
          <TextField
            placeholder={t('newsletter.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              flex: 1,
              bgcolor: 'white',
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '& fieldset': { borderColor: 'grey.300' },
              },
            }}
          />
          <Button
            variant="contained"
            sx={{
              bgcolor: '#0EA5E9',
              borderRadius: 2,
              px: 3,
              fontWeight: 500,
              fontSize: '1rem',
              textTransform: 'none',
              minWidth: 120,
              '&:hover': { bgcolor: '#0284C7' },
            }}
          >
            {t('newsletter.subscribe')}
          </Button>
        </Box>
      </Box>

      {/* Right illustration */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
        }}
      >
        <Box
          sx={{
            width: '16rem',
            height: '16rem',
            borderRadius: '50%',
            bgcolor: 'rgba(14, 165, 233, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <FlightIcon
              sx={{ fontSize: '5rem', color: '#0EA5E9', opacity: 0.5, transform: 'rotate(-45deg)' }}
            />
            <LocalOfferIcon sx={{ fontSize: '1.5rem', color: '#0EA5E9' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
