'use client';

import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';


import PriceRangeFilter from '@/components/traveler/PriceRangeFilter';
import AmenityFilter from '@/components/traveler/AmenityFilter';

import { searchProperties } from '@/app/lib/api/catalog';
import type { PaginatedResponse, PropertySummary, AmenitySummary } from '@/app/lib/types/catalog';


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

function SearchPage() {
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<PropertySummary> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Amenidades disponibles (pueden venir de API, aquí hardcodeadas)
  const amenityOptions: AmenitySummary[] = [
    { code: 'wifi', name: 'Wi-Fi' },
    { code: 'pool', name: 'Piscina' },
    { code: 'breakfast', name: 'Desayuno incluido' },
  ];

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchProperties({
        checkin: defaultCheckin(),
        checkout: defaultCheckout(),
        guests: 2,
        min_price: minPrice,
        max_price: maxPrice,
        amenities: selectedAmenities.length > 0 ? selectedAmenities.join(',') : undefined,
        page,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar hospedajes');
    } finally {
      setLoading(false);
    }
  }, [minPrice, maxPrice, selectedAmenities, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handlePriceApply = (min: number | undefined, max: number | undefined) => {
    setMinPrice(min);
    setMaxPrice(max);
    setPage(1);
  };

  const handleAmenityChange = (codes: string[]) => {
    setSelectedAmenities(codes);
    setPage(1);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, p: 3 }}>
      {/* Sidebar: filtros */}
      <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PriceRangeFilter minPrice={minPrice} maxPrice={maxPrice} onApply={handlePriceApply} />
        <AmenityFilter amenities={amenityOptions} selected={selectedAmenities} onChange={handleAmenityChange} />
      </Box>

      {/* Resultados */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="h5" gutterBottom>
          Hospedajes disponibles
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Typography color="error" sx={{ py: 2 }}>
            {error}
          </Typography>
        )}

        {!loading && data && data.items.length === 0 && (
          <Typography sx={{ py: 2 }}>
            No se encontraron hospedajes para los filtros seleccionados.
          </Typography>
        )}

        {!loading && data && data.items.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {data.total} resultado{data.total !== 1 ? 's' : ''}
            </Typography>
            <Grid container spacing={2}>
              {data.items.map((property) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={property.id}>
                  <Card>
                    {property.image && (
                      <CardMedia
                        component="img"
                        height={180}
                        image={property.image.url}
                        alt={property.image.caption ?? property.name}
                      />
                    )}
                    <CardContent>
                      <Typography variant="subtitle1" noWrap>
                        {property.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {property.city.name}, {property.city.country}
                      </Typography>
                      {property.min_price != null && (
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          ${property.min_price.toLocaleString()} / noche
                        </Typography>
                      )}
                      {property.rating_avg != null && (
                        <Typography variant="body2">
                          ⭐ {property.rating_avg} ({property.review_count} reseñas)
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {data.total_pages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={data.total_pages}
                  page={data.page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

export default SearchPage;
