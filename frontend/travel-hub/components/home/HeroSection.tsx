import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import SearchBar from '@/components/search/SearchBar';
import type { CityOut } from '@/app/lib/types/catalog';

export interface HeroSectionProps {
  checkin: string;
  checkout: string;
  guests: number;
  onCheckinChange: (v: string) => void;
  onCheckoutChange: (v: string) => void;
  onGuestsChange: (v: number) => void;
  onSearch: (city: CityOut) => void;
}

export default function HeroSection({
  checkin,
  checkout,
  guests,
  onCheckinChange,
  onCheckoutChange,
  onGuestsChange,
  onSearch,
}: HeroSectionProps) {
  return (
    <Box sx={{ bgcolor: 'white', py: { xs: 4, md: 8 }, textAlign: 'center' }}>
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Typography
          variant="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '2rem', md: '3rem' },
            lineHeight: 1,
            color: 'grey.900',
            letterSpacing: '-0.025em',
            mb: 2,
          }}
        >
          Find your next stay
        </Typography>

        <Typography
          sx={{
            fontSize: '1.125rem',
            lineHeight: 1.6,
            color: 'grey.500',
            maxWidth: 672,
            mx: 'auto',
            mb: 5,
          }}
        >
          Unlock exclusive deals on your favorite hotels, homes, and more in Latin America.
        </Typography>

        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          <SearchBar
            checkin={checkin}
            checkout={checkout}
            guests={guests}
            onCheckinChange={onCheckinChange}
            onCheckoutChange={onCheckoutChange}
            onGuestsChange={onGuestsChange}
            onSearch={onSearch}
            variant="button"
          />
        </Box>
      </Box>
    </Box>
  );
}
