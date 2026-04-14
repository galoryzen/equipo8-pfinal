# Frontend

The web app lives in [`travel-hub/`](./travel-hub/) (Next.js).

## Adding translated strings (i18next)

Strings are defined per locale under the **TravelHub** app:

- English (US): [`travel-hub/lib/i18n/locales/en-US/common.json`](./travel-hub/lib/i18n/locales/en-US/common.json)
- Spanish (Colombia): [`travel-hub/lib/i18n/locales/es-CO/common.json`](./travel-hub/lib/i18n/locales/es-CO/common.json)

**Workflow**

1. **Pick a key** — Use dot notation and group by feature, for example `search.placeholder`, `nav.logIn`, `footer.support.title`. Keep the same structure in both JSON files.
2. **Add the English text** under the matching path in `en-US/common.json`.
3. **Add the Spanish (Colombia) text** under the same path in `es-CO/common.json`.
4. **Use it in UI** — In a **client component** (`'use client'`), call `useTranslation()` from `react-i18next` and render `t('your.key')`:

   ```tsx
   import { useTranslation } from 'react-i18next';

   export function Example() {
     const { t } = useTranslation();
     return <p>{t('search.searchDestination')}</p>;
   }
   ```

5. **Interpolation** — Use `{{name}}` in JSON and pass values: `t('searchPage.staysIn', { city: cityName })`.
6. **Plurals** — Use `_one` / `_other` (and other plural forms as needed) under the same parent key, then call `t('search.guestsCount', { count: n })`. Add matching plural keys in both locale files.

The i18n instance is configured in [`travel-hub/lib/i18n/client.ts`](./travel-hub/lib/i18n/client.ts); the app is wrapped with `I18nProvider` in [`travel-hub/app/layout.tsx`](./travel-hub/app/layout.tsx). For tests, use `renderWithI18n` from [`travel-hub/__tests__/test-utils.tsx`](./travel-hub/__tests__/test-utils.tsx).

**Locales:** `en-US` (default) and `es-CO`. The navbar language toggle switches between them; the choice is stored in `localStorage` (`i18nextLng`).
