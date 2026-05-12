import React from 'react';

import i18n from '@/lib/i18n/client';
import { defaultLocale } from '@/lib/i18n/settings';
import { beforeAll, beforeEach, vi } from 'vitest';

// Set test environment locale to en-US for consistent formatting
beforeAll(() => {
  // Mock navigator.language
  Object.defineProperty(navigator, 'language', {
    value: 'en-US',
    writable: true,
    configurable: true,
  });

  // Set locale for number/date formatting
  if (typeof Intl !== 'undefined') {
    vi.stubGlobal('Intl', {
      ...Intl,
      NumberFormat: class extends Intl.NumberFormat {
        constructor(locales?: string | string[], options?: Intl.NumberFormatOptions) {
          super('en-US', options);
        }
      },
      DateTimeFormat: class extends Intl.DateTimeFormat {
        constructor(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
          super('en-US', options);
        }
      },
    });
  }
});

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    // Avoid JSX because this setup file is .ts
    React.createElement('img', props),
}));

beforeEach(async () => {
  await i18n.changeLanguage(defaultLocale);
});
