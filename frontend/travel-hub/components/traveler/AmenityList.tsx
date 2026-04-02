'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import WifiIcon from '@mui/icons-material/Wifi';
import PoolIcon from '@mui/icons-material/Pool';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import SpaIcon from '@mui/icons-material/Spa';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import RoomServiceIcon from '@mui/icons-material/RoomService';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import type { AmenitySummary } from '@/app/lib/types/catalog';

interface AmenityListProps {
  amenities: AmenitySummary[];
  previewCount?: number;
}

function getAmenityIcon(code: string) {
  const lower = code.toLowerCase();
  if (lower.includes('wifi') || lower.includes('internet')) return <WifiIcon fontSize="small" />;
  if (lower.includes('pool') || lower.includes('piscina')) return <PoolIcon fontSize="small" />;
  if (lower.includes('gym') || lower.includes('fitness')) return <FitnessCenterIcon fontSize="small" />;
  if (lower.includes('ac') || lower.includes('air')) return <AcUnitIcon fontSize="small" />;
  if (lower.includes('restaurant') || lower.includes('breakfast')) return <RestaurantIcon fontSize="small" />;
  if (lower.includes('spa')) return <SpaIcon fontSize="small" />;
  if (lower.includes('parking')) return <LocalParkingIcon fontSize="small" />;
  if (lower.includes('room_service') || lower.includes('service')) return <RoomServiceIcon fontSize="small" />;
  return <CheckCircleOutlineIcon fontSize="small" />;
}

export default function AmenityList({ amenities, previewCount = 6 }: AmenityListProps) {
  const [open, setOpen] = useState(false);
  const preview = amenities.slice(0, previewCount);

  if (!amenities.length) return null;

  return (
    <>
      <Grid container spacing={1.5}>
        {preview.map((a) => (
          <Grid key={a.code} size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.primary' }}>
              <Box sx={{ color: 'text.secondary' }}>{getAmenityIcon(a.code)}</Box>
              <Typography variant="body2">{a.name}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {amenities.length > previewCount && (
        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 2, borderRadius: 2, textTransform: 'none' }}
          onClick={() => setOpen(true)}
        >
          Show all {amenities.length} amenities
        </Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          All amenities
          <IconButton onClick={() => setOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {amenities.map((a) => (
              <Chip
                key={a.code}
                icon={getAmenityIcon(a.code)}
                label={a.name}
                variant="outlined"
                sx={{ fontSize: '0.85rem' }}
              />
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
