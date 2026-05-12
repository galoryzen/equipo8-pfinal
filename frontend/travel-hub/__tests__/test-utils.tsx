import type { ReactElement, ReactNode } from 'react';

import { CurrencyProvider } from '@/lib/currency/CurrencyProvider';
import { type RenderOptions, render } from '@testing-library/react';

import { I18nProvider } from '@/components/i18n/I18nProvider';

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </I18nProvider>
  );
}

export function renderWithI18n(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}
