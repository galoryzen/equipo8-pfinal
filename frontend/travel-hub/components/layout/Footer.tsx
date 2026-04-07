import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FacebookIcon from '@mui/icons-material/Facebook';

const FOOTER_SECTIONS = [
  {
    title: 'Support',
    links: ['Help Center', 'Safety information', 'Cancellation options', 'Report a concern'],
  },
  {
    title: 'Community',
    links: ['TravelHub Blog', 'Community Forum', 'Travel Guides'],
  },
  {
    title: 'Hosting',
    links: ['List your property', 'Host resources', 'Community forum'],
  },
  {
    title: 'About',
    links: ['Newsroom', 'Learn about new features', 'Careers', 'Investors'],
  },
];

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        pt: 8,
        pb: 4,
      }}
    >
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 } }}>
        {/* Link columns */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 4,
          }}
        >
          {FOOTER_SECTIONS.map((section) => (
            <Box key={section.title}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: '#111827',
                  lineHeight: '24px',
                  mb: 2,
                }}
              >
                {section.title}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {section.links.map((link) => (
                  <Typography
                    key={link}
                    component="a"
                    href="#"
                    sx={{
                      fontSize: 14,
                      color: '#64748B',
                      lineHeight: '20px',
                      textDecoration: 'none',
                      '&:hover': { color: '#0EA5E9' },
                    }}
                  >
                    {link}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Bottom bar */}
        <Box
          sx={{
            borderTop: '1px solid #E5E7EB',
            mt: 6,
            pt: 4,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          {/* Left: logo + copyright */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src="/icon.svg" alt="TravelHub" width={17} height={17} />
            <Typography sx={{ fontSize: 14, color: '#64748B', lineHeight: '20px' }}>
              &copy; 2026 TravelHub, Inc.
            </Typography>
          </Box>

          {/* Center: legal links */}
          <Box sx={{ display: 'flex', gap: 3 }}>
            {['Privacy', 'Terms', 'Sitemap'].map((text) => (
              <Typography
                key={text}
                component="a"
                href="#"
                sx={{
                  fontSize: 14,
                  color: '#64748B',
                  lineHeight: '20px',
                  textDecoration: 'none',
                  '&:hover': { color: '#0EA5E9' },
                }}
              >
                {text}
              </Typography>
            ))}
          </Box>

          {/* Right: social icons */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box component="a" href="#" sx={{ color: '#64748B', display: 'flex', '&:hover': { color: '#0EA5E9' } }}>
              <FacebookIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography
              component="a"
              href="#"
              sx={{
                fontWeight: 700,
                fontSize: 14,
                color: '#64748B',
                textDecoration: 'none',
                lineHeight: '20px',
                '&:hover': { color: '#0EA5E9' },
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
                color: '#64748B',
                textDecoration: 'none',
                lineHeight: '20px',
                '&:hover': { color: '#0EA5E9' },
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
