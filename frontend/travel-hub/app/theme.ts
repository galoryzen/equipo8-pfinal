'use client';

import { Roboto } from 'next/font/google';

import { tokens as th } from '@/lib/theme/tokens';
import { createTheme } from '@mui/material/styles';

export const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
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
      main: th.brand.primary,
      dark: th.brand.primaryOnLight,
      light: '#38BDF8',
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
