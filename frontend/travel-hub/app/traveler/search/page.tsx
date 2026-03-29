'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

import { getFeaturedProperties, searchProperties } from '@/app/lib/api/catalog';
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
  { key: 'rating', label: 'Rating' },
] as const;

const PAGE_SIZE = 20;

function errorToMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Error searching properties';
}

function SearchPage() {
  const [cityId, setCityId] = useState<string | null>(null);
  const [cityLabel, setCityLabel] = useState('');
  const [checkin, setCheckin] = useState(defaultCheckin);
  const [checkout, setCheckout] = useState(defaultCheckout);
  const [guests, setGuests] = useState(2);
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('');
  const [page, setPage] = useState(1);
  const [featuredRaw, setFeaturedRaw] = useState<PropertySummary[]>([]);
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

  const loadFeatured = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getFeaturedProperties();
      setFeaturedRaw(list);
      setData(null);
    } catch (err) {
      setError(errorToMessage(err));
      setFeaturedRaw([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSearch = useCallback(async () => {
    if (!cityId) return;
    setLoading(true);
    setError(null);
    try {
      const sortParam =
        sortBy === 'rating' ? 'rating' : sortBy === 'price_asc' ? 'price_asc' : sortBy || undefined;
      const result = await searchProperties({
        checkin,
        checkout,
        guests,
        city_id: cityId,
        min_price: minPrice,
        max_price: maxPrice,
        amenities: selectedAmenities.length > 0 ? selectedAmenities.join(',') : undefined,
        sort_by: sortParam,
        page,
        page_size: PAGE_SIZE,
      });
      setData(result);
      setFeaturedRaw([]);
    } catch (err) {
      setError(errorToMessage(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    cityId,
    checkin,
    checkout,
    guests,
    minPrice,
    maxPrice,
    selectedAmenities,
    sortBy,
    page,
  ]);

  useEffect(() => {
    if (!cityId) {
      void loadFeatured();
    }
  }, [cityId, loadFeatured]);

  useEffect(() => {
    if (cityId) {
      void loadSearch();
    }
  }, [cityId, loadSearch]);

  useEffect(() => {
    setPage(1);
  }, [minPrice, maxPrice, selectedAmenities, sortBy]);

  const browsePaginated = useMemo((): PaginatedResponse<PropertySummary> | null => {
    if (cityId) return null;
    let items = [...featuredRaw];
    if (minPrice != null) {
      items = items.filter((p) => p.min_price != null && Number(p.min_price) >= minPrice);
    }
    if (maxPrice != null) {
      items = items.filter((p) => p.min_price != null && Number(p.min_price) <= maxPrice);
    }
    if (selectedAmenities.length > 0) {
      items = items.filter((p) =>
        selectedAmenities.every((code) => p.amenities.some((a) => a.code === code))
      );
    }
    if (sortBy === 'price_asc') {
      items.sort((a, b) => Number(a.min_price ?? 0) - Number(b.min_price ?? 0));
    } else if (sortBy === 'rating') {
      items.sort((a, b) => Number(b.rating_avg ?? 0) - Number(a.rating_avg ?? 0));
    }
    const total = items.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE);
    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    const slice = items.slice(start, start + PAGE_SIZE);
    return {
      items: slice,
      total,
      page: safePage,
      page_size: PAGE_SIZE,
      total_pages: totalPages,
      message: null,
    };
  }, [cityId, featuredRaw, minPrice, maxPrice, selectedAmenities, sortBy, page]);

  const gridData: PaginatedResponse<PropertySummary> | null = cityId ? data : browsePaginated;

  const handleSearch = (newCityId: string | null, label: string) => {
    setCityId(newCityId);
    setCityLabel(newCityId ? label : '');
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

  const emptyMessage = useMemo(() => {
    if (!gridData || gridData.items.length > 0) return '';
    const backendMsg = gridData.message?.trim();
    if (backendMsg) return backendMsg;
    if (cityId) return 'No properties found for the selected destination and dates.';
    if (featuredRaw.length === 0) return 'No featured stays available right now.';
    return 'No properties match the selected filters.';
  }, [gridData, cityId, featuredRaw.length]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'grey.200', py: 2, px: 3 }}>
        <SearchBar
          initialCityLabel={cityLabel}
          checkin={checkin}
          checkout={checkout}
          guests={guests}
          onCheckinChange={setCheckin}
          onCheckoutChange={setCheckout}
          onGuestsChange={setGuests}
          onSearch={handleSearch}
        />
      </Box>

      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {cityId && cityLabel ? `Stays in ${cityLabel}` : 'All stays'}
          </Typography>
          {gridData && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {gridData.total} place{gridData.total !== 1 ? 's' : ''} found · {formatDateRange()}
              {cityId ? '' : ' · browse popular destinations'}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {SORT_OPTIONS.map((opt) => (
            <Chip
              key={opt.label}
              label={`${opt.label}${sortBy === opt.key && opt.key ? ' \u2193' : ''}`}
              onClick={() => {
                setSortBy(opt.key);
                setPage(1);
              }}
              variant={sortBy === opt.key ? 'filled' : 'outlined'}
              color={sortBy === opt.key ? 'primary' : 'default'}
              sx={{ fontWeight: 500 }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, px: 3, pb: 4 }}>
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

          {!loading && gridData && gridData.items.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary" variant="h6">
                {emptyMessage}
              </Typography>
            </Box>
          )}

          {!loading && gridData && gridData.items.length > 0 && (
            <>
              <Grid container spacing={2.5}>
                {gridData.items.map((property) => (
                  <Grid size={{ xs: 12, sm: 6, xl: 4 }} key={property.id}>
                    <PropertyCard property={property} />
                  </Grid>
                ))}
              </Grid>

              {gridData.total_pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={gridData.total_pages}
                    page={gridData.page}
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
