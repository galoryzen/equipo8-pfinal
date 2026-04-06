'use client';

import NextLink from 'next/link';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SearchIcon from '@mui/icons-material/Search';

export type NotFoundVariant = 'route' | 'property' | 'missingParam';

const COPY: Record<
  NotFoundVariant,
  { title: string; description: string }
> = {
  route: {
    title: 'Página no encontrada',
    description: 'La ruta que buscas no existe o ha cambiado. Revisa la URL o vuelve al inicio.',
  },
  property: {
    title: 'Alojamiento no encontrado',
    description:
      'No existe un hotel con este identificador o ya no está disponible. Prueba buscar de nuevo.',
  },
  missingParam: {
    title: 'Enlace incompleto',
    description: 'Falta el identificador del alojamiento. Entra desde la búsqueda o el listado.',
  },
};

interface NotFoundViewProps {
  /** Qué mensaje mostrar; por defecto ruta inexistente. */
  variant?: NotFoundVariant;
}

export default function NotFoundView({ variant = 'route' }: NotFoundViewProps) {
  const { title, description } = COPY[variant];

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: 4, color: 'text.secondary', fontWeight: 600, fontSize: '0.85rem' }}
        >
          Error 404
        </Typography>
        <Typography variant="h4" component="h1" fontWeight={700} sx={{ mt: 1, mb: 2, color: 'text.primary' }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
          {description}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button
            component={NextLink}
            href="/"
            variant="outlined"
            size="large"
            startIcon={<HomeOutlinedIcon />}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Ir al inicio
          </Button>
          <Button
            component={NextLink}
            href="/traveler/search"
            variant="contained"
            size="large"
            disableElevation
            startIcon={<SearchIcon />}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Buscar alojamientos
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
