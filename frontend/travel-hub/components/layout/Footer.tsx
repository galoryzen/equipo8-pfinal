'use client';

import Image from 'next/image';

import FacebookIcon from '@mui/icons-material/Facebook';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

const FOOTER_KEYS = ['support', 'community', 'hosting', 'about'] as const;

export default function Footer() {
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        pt: 8,
        pb: 4,
      }}
    >
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 4,
          }}
        >
          {FOOTER_KEYS.map((key) => (
            <Box key={key}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: 'text.primary',
                  lineHeight: '24px',
                  mb: 2,
                }}
              >
                {t(`footer.${key}.title`)}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(t(`footer.${key}.links`, { returnObjects: true }) as string[]).map((link) => (
                  <Typography
                    key={link}
                    component="a"
                    href="#"
                    sx={{
                      fontSize: 14,
                      color: 'text.secondary',
                      lineHeight: '20px',
                      textDecoration: 'none',
                      '&:hover': { color: 'primary.dark' },
                    }}
                  >
                    {link}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            mt: 6,
            pt: 4,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Image src="/icon.svg" alt={t('brand.name')} width={17} height={17} />
            <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: '20px' }}>
              {t('footer.copyright')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 3 }}>
            {(t('footer.legal', { returnObjects: true }) as string[]).map((text) => (
              <Typography
                key={text}
                component="a"
                href="#"
                sx={{
                  fontSize: 14,
                  color: 'text.secondary',
                  lineHeight: '20px',
                  textDecoration: 'none',
                  '&:hover': { color: 'primary.dark' },
                }}
              >
                {text}
              </Typography>
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box
              component="a"
              href="#"
              sx={{
                color: 'text.secondary',
                display: 'flex',
                '&:hover': { color: 'primary.dark' },
              }}
              aria-label="Facebook"
            >
              <FacebookIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography
              component="a"
              href="#"
              sx={{
                fontWeight: 700,
                fontSize: 14,
                color: 'text.secondary',
                textDecoration: 'none',
                lineHeight: '20px',
                '&:hover': { color: 'primary.dark' },
              }}
            >
              IG
            </Typography>
            <Typography
              component="a"
              href="#"
              sx={{
                fontWeight: 700,
                fontSize: 14,
                color: 'text.secondary',
                textDecoration: 'none',
                lineHeight: '20px',
                '&:hover': { color: 'primary.dark' },
              }}
            >
              X
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
