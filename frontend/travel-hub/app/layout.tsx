import type { Metadata } from 'next';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';

import './globals.css';
import { roboto, theme } from './theme';

import { DocumentLang } from '@/components/i18n/DocumentLang';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import { TranslatedMeta } from '@/components/i18n/TranslatedMeta';

export const metadata: Metadata = {
  title: 'TravelHub — Find Your Next Stay',
  description: 'Unlock exclusive deals on hotels, homes, and more across Latin America.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US" className={roboto.variable} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <I18nProvider>
          <DocumentLang />
          <TranslatedMeta />
          <AppRouterCacheProvider>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
          </AppRouterCacheProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
