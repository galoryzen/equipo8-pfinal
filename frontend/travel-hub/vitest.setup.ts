import React from 'react';

import i18n from '@/lib/i18n/client';
import { defaultLocale } from '@/lib/i18n/settings';
import { beforeEach, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    // Avoid JSX because this setup file is .ts
    React.createElement('img', props),
}));

beforeEach(async () => {
  await i18n.changeLanguage(defaultLocale);
});
