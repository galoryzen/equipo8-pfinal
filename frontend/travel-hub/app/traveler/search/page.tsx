'use client';

import { useCallback, useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';

import AmenityFilter from '@/components/traveler/AmenityFilter';
import PriceRangeFilter from '@/components/traveler/PriceRangeFilter';
import PropertyCard from '@/components/traveler/PropertyCard';
import SearchBar from '@/components/traveler/SearchBar';

import { searchProperties } from '@/app/lib/api/catalog';
import type { AmenitySummary, PaginatedResponse, PropertySummary } from '@/app/lib/types/catalog';

function defaultCheckin(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function defaultCheckout(): string {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toISOString().slice(0, 10);
}

const SORT_OPTIONS = [
  { key: '', label: 'Sort' },
  { key: 'price_asc', label: 'Price' },
  { key: 'rating_desc', label: 'Rating 4.5+' },
] as const;

function SearchPage() {
  const [city, setCity] = useState('');
  const [checkin, setCheckin] = useState(defaultCheckin);
  const [checkout, setCheckout] = useState(defaultCheckout);
  const [guests, setGuests] = useState(2);
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<PropertySummary> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amenityOptions: AmenitySummary[] = [
    { code: 'wifi', name: 'Wifi' },
    { code: 'kitchen', name: 'Kitchen' },
    { code: 'pool', name: 'Pool' },
    { code: 'air_conditioning', name: 'Air conditioning' },
    { code: 'breakfast', name: 'Breakfast' },
    { code: 'parking', name: 'Parking' },
  ];

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchProperties({
        checkin,
        checkout,
        guests,
        min_price: minPrice,
        max_price: maxPrice,
        amenities: selectedAmenities.length > 0 ? selectedAmenities.join(',') : undefined,
        sort_by: sortBy || undefined,
        page,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error searching properties');
    } finally {
      setLoading(false);
    }
  }, [checkin, checkout, guests, minPrice, maxPrice, selectedAmenities, sortBy, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSearch = (newCity: string, newCheckin: string, newCheckout: string, newGuests: number) => {
    setCity(newCity);
    setCheckin(newCheckin);
    setCheckout(newCheckout);
    setGuests(newGuests);
    setPage(1);
  };

  const handlePriceApply = (min: number | undefined, max: number | undefined) => {
    setMinPrice(min);
    setMaxPrice(max);
    setPage(1);
  };

  const handleAmenityChange = (codes: string[]) => {
    setSelectedAmenities(codes);
    setPage(1);
  };

  const formatDateRange = () => {
    const fmt = (d: string) => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    return `${fmt(checkin)} - ${fmt(checkout)}`;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Search Bar */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'grey.200', py: 2, px: 3 }}>
        <SearchBar
          initialCity={city}
          initialCheckin={checkin}
          initialCheckout={checkout}
          initialGuests={guests}
          onSearch={handleSearch}
        />
      </Box>

      {/* Results header */}
      <Box sx={{ px: 3, pt: 3, pb: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {city ? `Stays in ${city}` : 'All stays'}
          </Typography>
          {data && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {data.total} place{data.total !== 1 ? 's' : ''} found · {formatDateRange()}
            </Typography>
          )}
        </Box>

        {/* Sort chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {SORT_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              label={`${opt.label}${sortBy === opt.key && opt.key ? ' \u2193' : ''}`}
              onClick={() => { setSortBy(opt.key); setPage(1); }}
              variant={sortBy === opt.key ? 'filled' : 'outlined'}
              color={sortBy === opt.key ? 'primary' : 'default'}
              sx={{ fontWeight: 500 }}
            />
          ))}
        </Box>
      </Box>

      {/* Main content: sidebar + grid */}
      <Box sx={{ display: 'flex', gap: 3, px: 3, pb: 4 }}>
        {/* Sidebar */}
        <Box
          component="aside"
          sx={{
            width: 260,
            flexShrink: 0,
            display: { xs: 'none', lg: 'block' },
            position: 'sticky',
            top: 16,
            alignSelf: 'flex-start',
            pt: 2,
          }}
        >
          <PriceRangeFilter minPrice={minPrice} maxPrice={maxPrice} onApply={handlePriceApply} />
          <Divider sx={{ my: 3 }} />
          <AmenityFilter amenities={amenityOptions} selected={selectedAmenities} onChange={handleAmenityChange} />
        </Box>

        {/* Results grid */}
        <Box sx={{ flex: 1, pt: 2 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && data && data.items.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary" variant="h6">
                No properties found for the selected filters.
              </Typography>
            </Box>
          )}

          {!loading && data && data.items.length > 0 && (
            <>
              <Grid container spacing={2.5}>
                {data.items.map((property) => (
                  <Grid size={{ xs: 12, sm: 6, xl: 4 }} key={property.id}>
                    <PropertyCard property={property} />
                  </Grid>
                ))}
              </Grid>

              {data.total_pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={data.total_pages}
                    page={data.page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default SearchPage;