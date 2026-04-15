'use client';

import { useMemo, useState } from 'react';

import NextLink from 'next/link';

import { useMyTripsCatalog } from '@/app/hooks/useMyTripsCatalog';
import { splitUpcomingPast } from '@/app/lib/myTrips/formatting';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import BookingList from '@/components/traveler/BookingList';
import TripsEmptyState from '@/components/traveler/TripsEmptyState';

export default function MyTripsPage() {
  const { t } = useTranslation();
  const { bookings, propertyById, loading, error } = useMyTripsCatalog();
  const [tab, setTab] = useState(0);

  const { upcoming, past } = useMemo(() => splitUpcomingPast(bookings), [bookings]);
  const shown = tab === 0 ? upcoming : past;

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            My Trips
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage your upcoming and past reservations.
          </Typography>
        </Box>
        <Button
          component={NextLink}
          href="/traveler/search"
          variant="contained"
          sx={{ textTransform: 'none' }}
        >
          Find a hotel
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress aria-label={t('a11y.loading')} />
        </Box>
      ) : !error && bookings.length === 0 ? (
        <TripsEmptyState />
      ) : error ? null : (
        <>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              mb: 3,
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Upcoming
                  {upcoming.length > 0 && (
                    <Chip
                      label={upcoming.length}
                      size="small"
                      color="primary"
                      sx={{ height: 22 }}
                    />
                  )}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Past
                  {past.length > 0 && <Chip label={past.length} size="small" sx={{ height: 22 }} />}
                </Box>
              }
            />
          </Tabs>

          {shown.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4 }}>
              {tab === 0 ? 'No upcoming trips in this tab.' : 'No past trips yet.'}
            </Typography>
          ) : (
            <BookingList bookings={shown} propertyById={propertyById} />
          )}

          {bookings.length > 0 && (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 6 }}>
              End of your {tab === 0 ? 'upcoming' : 'past'} trips.
            </Typography>
          )}
        </>
      )}
    </Container>
  );
}
