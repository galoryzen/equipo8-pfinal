'use client';

import { useState } from 'react';

import { useCurrency } from '@/lib/currency/CurrencyProvider';
import { loadLocale } from '@/lib/i18n/client';
import { AppLocale, localeFlags, localeLabels, locales } from '@/lib/i18n/settings';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

export default function LanguageCurrencyDropdown() {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const { currency, setCurrency, availableCurrencies } = useCurrency();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const currentLocale = locales.includes(i18n.language as AppLocale)
    ? (i18n.language as AppLocale)
    : 'en-US';

  function handleOpen(event: React.MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  async function handleSelectLanguage(locale: AppLocale) {
    handleClose();
    if (locale === i18n.language) return;
    await loadLocale(locale);
    await i18n.changeLanguage(locale);
  }

  function handleSelectCurrency(code: string) {
    handleClose();
    setCurrency(code as (typeof availableCurrencies)[number]['code']);
  }

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{ color: 'text.secondary', borderRadius: '8px', minWidth: 'auto', px: 1 }}
        aria-label="Change language or currency"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography component="span" sx={{ fontSize: '1.1rem', lineHeight: 1 }}>
            {localeFlags[currentLocale]}
          </Typography>
          <Typography
            component="span"
            sx={{ fontSize: '0.7rem', fontWeight: 500, color: 'text.secondary' }}
          >
            {currentLocale.split('-')[1]}
          </Typography>
          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, borderColor: 'divider', height: 14, alignSelf: 'center' }}
          />
          <Typography
            component="span"
            sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}
          >
            {currency}
          </Typography>
        </Box>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, borderRadius: '12px', minWidth: 220 } } }}
      >
        <Typography
          variant="caption"
          sx={{ px: 2, py: 1, color: 'text.disabled', fontWeight: 600, letterSpacing: '0.05em' }}
        >
          {t('language.label', 'LANGUAGE')}
        </Typography>
        {locales.map((locale) => (
          <MenuItem
            key={locale}
            onClick={() => handleSelectLanguage(locale)}
            selected={locale === currentLocale}
            sx={{
              fontSize: '0.875rem',
              gap: 1,
              py: 1,
              '&.Mui-selected': { backgroundColor: 'action.selected' },
            }}
          >
            <Typography component="span" sx={{ fontSize: '1.1rem' }}>
              {localeFlags[locale]}
            </Typography>
            {localeLabels[locale]}
          </MenuItem>
        ))}

        <Divider sx={{ my: 1 }} />

        <Typography
          variant="caption"
          sx={{ px: 2, py: 1, color: 'text.disabled', fontWeight: 600, letterSpacing: '0.05em' }}
        >
          {t('currency.label', 'CURRENCY')}
        </Typography>
        {availableCurrencies.map((c) => (
          <MenuItem
            key={c.code}
            onClick={() => handleSelectCurrency(c.code)}
            selected={c.code === currency}
            sx={{
              fontSize: '0.875rem',
              gap: 1,
              py: 1,
              '&.Mui-selected': { backgroundColor: 'action.selected' },
            }}
          >
            <Typography component="span" sx={{ fontSize: '1.1rem' }}>
              {c.flag}
            </Typography>
            {c.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
