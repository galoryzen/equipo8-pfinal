'use client';

import { useState } from 'react';

import { loadLocale } from '@/lib/i18n/client';
import { AppLocale, localeFlags, localeLabels, locales } from '@/lib/i18n/settings';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

export default function LanguageDropdown() {
  const { i18n } = useTranslation();
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

  async function handleSelect(locale: AppLocale) {
    handleClose();
    if (locale === i18n.language) return;
    await loadLocale(locale);
    await i18n.changeLanguage(locale);
  }

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{ color: 'text.secondary', borderRadius: '8px', minWidth: 'auto', px: 1 }}
        aria-label="Change language"
      >
        <Typography component="span" sx={{ fontSize: '1.1rem', lineHeight: 1 }}>
          {localeFlags[currentLocale]}
        </Typography>
        <Typography
          component="span"
          sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary', ml: 0.5 }}
        >
          {currentLocale.split('-')[1]}
        </Typography>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, borderRadius: '12px', minWidth: 180 } } }}
      >
        {locales.map((locale) => (
          <MenuItem
            key={locale}
            onClick={() => handleSelect(locale)}
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
      </Menu>
    </>
  );
}
