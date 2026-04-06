'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';

import type { PropertyImageOut } from '@/app/lib/types/catalog';

interface ImageGalleryProps {
  images: PropertyImageOut[];
  propertyName: string;
}

export default function ImageGallery({ images, propertyName }: ImageGalleryProps) {
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const main = images[0] ?? null;
  const thumbs = images.slice(1, 5);

  if (!main) {
    return (
      <Box sx={{ height: 400, bgcolor: 'grey.200', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">No images available</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 1, height: 440, borderRadius: 3, overflow: 'hidden' }}>
        {/* Large main image */}
        <Box
          sx={{ gridColumn: '1', gridRow: '1 / 3', position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
          onClick={() => { setSelectedIdx(0); setOpen(true); }}
        >
          <Box
            component="img"
            src={main.url}
            alt={main.caption ?? propertyName}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.03)' } }}
          />
        </Box>

        {/* Thumbnails */}
        {[0, 1, 2, 3].map((i) => {
          const img = thumbs[i];
          const isLast = i === 3 && images.length > 5;
          return (
            <Box
              key={i}
              sx={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', bgcolor: 'grey.200' }}
              onClick={() => { setSelectedIdx(i + 1); setOpen(true); }}
            >
              {img ? (
                <>
                  <Box
                    component="img"
                    src={img.url}
                    alt={img.caption ?? `Photo ${i + 2}`}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.03)' } }}
                  />
                  {isLast && (
                    <Box
                      sx={{
                        position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white',
                      }}
                    >
                      <PhotoLibraryIcon sx={{ fontSize: 28, mb: 0.5 }} />
                      <Typography variant="body2" fontWeight={600}>
                        Show all photos
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                <Box sx={{ width: '100%', height: '100%', bgcolor: 'grey.200' }} />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Lightbox dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {selectedIdx + 1} / {images.length}
          </Typography>
          <IconButton onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
            {images.map((img, idx) => (
              <Box
                key={img.id}
                component="img"
                src={img.url}
                alt={img.caption ?? `Photo ${idx + 1}`}
                onClick={() => setSelectedIdx(idx)}
                sx={{
                  height: 500,
                  flexShrink: 0,
                  maxWidth: '100%',
                  objectFit: 'contain',
                  cursor: 'pointer',
                  border: idx === selectedIdx ? '3px solid' : '3px solid transparent',
                  borderColor: idx === selectedIdx ? 'primary.main' : 'transparent',
                  borderRadius: 1,
                }}
              />
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
