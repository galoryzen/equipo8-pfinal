'use client';

import { Roboto } from 'next/font/google';

import { tokens as th } from '@/lib/theme/tokens';
import { createTheme } from '@mui/material/styles';

export const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const theme = createTheme({
  colorSchemes: { light: true },
  typography: {
    fontFamily: roboto.style.fontFamily,
  },
  palette: {
    mode: 'light',
    primary: {
      /**
       * Use a darker primary as the default “main” so white text on primary-filled
       * controls (e.g. contained buttons) meets WCAG AA contrast.
       *
       * Keep the lighter brand color available via `primary.light` for accents.
       */
      main: th.brand.primaryActive,
      dark: th.brand.primaryOnLight,
      light: th.brand.primary,
      contrastText: '#ffffff',
    },
    text: {
      primary: th.text.primary,
      secondary: th.text.secondary,
      disabled: th.text.disabled,
    },
    divider: th.border.default,
    background: {
      default: th.surface.paper,
      paper: th.surface.paper,
    },
  },
});
