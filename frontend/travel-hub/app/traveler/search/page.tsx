'use client';

import { useCallback, useEffect, useState } from 'react';

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
    <div className="min-h-screen bg-gray-50">
      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <SearchBar
          initialCity={city}
          initialCheckin={checkin}
          initialCheckout={checkout}
          initialGuests={guests}
          onSearch={handleSearch}
        />
      </div>

      {/* Results header */}
      <div className="px-6 pt-6 pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {city ? `Stays in ${city}` : 'All stays'}
          </h1>
          {data && (
            <p className="text-sm text-gray-500 mt-0.5">
              {data.total} place{data.total !== 1 ? 's' : ''} found
              {' · '}
              {formatDateRange()}
            </p>
          )}
        </div>

        {/* Sort chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                setSortBy(opt.key);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                sortBy === opt.key
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {opt.label}
              {sortBy === opt.key && opt.key && (
                <span className="ml-1">&#8595;</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main content: sidebar + grid */}
      <div className="flex gap-6 px-6 pb-8">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="sticky top-4 flex flex-col gap-8 pt-4">
            <PriceRangeFilter minPrice={minPrice} maxPrice={maxPrice} onApply={handlePriceApply} />

            <div className="border-t border-gray-200 pt-6">
              <AmenityFilter
                amenities={amenityOptions}
                selected={selectedAmenities}
                onChange={handleAmenityChange}
              />
            </div>
          </div>
        </aside>

        {/* Results grid */}
        <div className="flex-1 pt-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {!loading && data && data.items.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No properties found for the selected filters.</p>
            </div>
          )}

          {!loading && data && data.items.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {data.items.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>

              {/* Pagination */}
              {data.total_pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>
                  {Array.from({ length: data.total_pages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === data.total_pages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p} className="flex items-center gap-1">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="text-gray-400 px-1">...</span>
                        )}
                        <button
                          onClick={() => setPage(p)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            p === page
                              ? 'bg-blue-500 text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                  <button
                    onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                    disabled={page === data.total_pages}
                    className="px-3 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchPage;