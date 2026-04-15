'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import type { CityOut } from '@/app/lib/types/catalog';
import Box from '@mui/material/Box';

import HeroSection from '@/components/home/HeroSection';
import NewsletterSection from '@/components/home/NewsletterSection';
import PopularDestinations from '@/components/home/PopularDestinations';
import RecommendedSection from '@/components/home/RecommendedSection';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';

function defaultCheckin(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function defaultCheckout(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

export default function HomePage() {
  const router = useRouter();
  const [checkin, setCheckin] = useState(defaultCheckin);
  const [checkout, setCheckout] = useState(defaultCheckout);
  const [guests, setGuests] = useState(1);

  const handleSearch = (city: CityOut | null) => {
    if (city) {
      const params = new URLSearchParams({
        cityId: city.id,
        cityName: city.name,
        cityCountry: city.country,
        checkin,
        checkout,
        guests: String(guests),
      });
      if (city.department) params.set('cityDepartment', city.department);
      router.push(`/traveler/search?${params.toString()}`);
    } else {
      const params = new URLSearchParams({
        checkin,
        checkout,
        guests: String(guests),
      });
      router.push(`/traveler/search?${params.toString()}`);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <HeroSection
        checkin={checkin}
        checkout={checkout}
        guests={guests}
        onCheckinChange={setCheckin}
        onCheckoutChange={setCheckout}
        onGuestsChange={setGuests}
        onSearch={handleSearch}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          bgcolor: '#F8FAFC',
          py: 6,
          px: { xs: 2, md: 4 },
        }}
      >
        <Box
          sx={{
            maxWidth: 1280,
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <PopularDestinations checkin={checkin} checkout={checkout} guests={guests} />
          <RecommendedSection />
          <NewsletterSection />
        </Box>
      </Box>

      <Footer />
    </Box>
  );
}
