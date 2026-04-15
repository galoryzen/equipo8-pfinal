import type { ReactElement, ReactNode } from 'react';

import { type RenderOptions, render } from '@testing-library/react';

import { I18nProvider } from '@/components/i18n/I18nProvider';

function AllProviders({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

export function renderWithI18n(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}
