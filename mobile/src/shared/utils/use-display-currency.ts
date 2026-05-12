import { useCallback } from 'react';

import { usePreferences } from '@src/services/preferences-context';
import { formatCurrency, type FormatCurrencyOptions } from '@src/shared/utils/format-currency';

/**
 * Returns a formatter bound to the user's chosen display currency.
 * The source currency comes from the backend (per item) and is converted
 * to the display currency via the static fx-rates table.
 */
export function useDisplayCurrency() {
  const { displayCurrency } = usePreferences();

  const format = useCallback(
    (amount: number, sourceCurrency: string, opts: FormatCurrencyOptions = {}) =>
      formatCurrency(amount, sourceCurrency, { ...opts, displayCurrency }),
    [displayCurrency],
  );

  return { displayCurrency, format };
}
