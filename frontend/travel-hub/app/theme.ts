'use client';

import { Roboto } from 'next/font/google';

import { createTheme } from '@mui/material/styles';

export const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const theme = createTheme({
  typography: {
    fontFamily: roboto.style.fontFamily,
  },
});
