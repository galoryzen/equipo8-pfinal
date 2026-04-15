import { beforeEach } from 'vitest';

import i18n from '@/lib/i18n/client';
import { defaultLocale } from '@/lib/i18n/settings';

beforeEach(async () => {
  await i18n.changeLanguage(defaultLocale);
});
