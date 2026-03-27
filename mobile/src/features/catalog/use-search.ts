import { useCallback, useEffect, useRef, useState } from 'react';

import type { CityInfo, PropertySummary } from '@src/types/catalog';
import { searchCities, searchProperties } from './catalog-service';

function getDefaultDates() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { checkin: fmt(tomorrow), checkout: fmt(dayAfter) };
}

interface UseSearchResult {
  query: string;
  setQuery: (q: string) => void;
  citySuggestions: CityInfo[];
  selectCity: (city: CityInfo) => void;
  selectedCity: CityInfo | null;
  clearCity: () => void;
  search: () => void;
  results: PropertySummary[];
  hasSearched: boolean;
  loading: boolean;
  loadingCities: boolean;
  error: string | null;
  total: number;
  amenityFilters: string[];
  toggleAmenity: (code: string) => void;
}

export function useSearch(initialCity?: CityInfo | null): UseSearchResult {
  const [query, setQuery] = useState(initialCity?.name ?? '');
  const [citySuggestions, setCitySuggestions] = useState<CityInfo[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityInfo | null>(
    initialCity ?? null,
  );
  const [results, setResults] = useState<PropertySummary[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [amenityFilters, setAmenityFilters] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // City autocomplete with debounce
  useEffect(() => {
    if (selectedCity) {
      setCitySuggestions([]);
      return;
    }
    if (query.length < 2) {
      setCitySuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoadingCities(true);
      try {
        const cities = await searchCities(query);
        setCitySuggestions(cities);
      } catch {
        setCitySuggestions([]);
      } finally {
        setLoadingCities(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedCity]);

  // Explicit search triggered by user
  const fetchProperties = useCallback(
    async (city: CityInfo, amenities: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const { checkin, checkout } = getDefaultDates();
        const response = await searchProperties({
          city_id: city.id,
          checkin,
          checkout,
          guests: 1,
          amenities: amenities.length > 0 ? amenities : undefined,
        });
        setResults(response.items);
        setTotal(response.total);
      } catch {
        setError('No se pudo conectar al servidor.');
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    },
    [],
  );

  // Auto-search when initialCity changes (e.g. navigating back with a new city)
  const prevCityIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialCity && initialCity.id !== prevCityIdRef.current) {
      prevCityIdRef.current = initialCity.id;
      setSelectedCity(initialCity);
      setQuery(initialCity.name);
      setAmenityFilters([]);
      fetchProperties(initialCity, []);
    }
  }, [initialCity, fetchProperties]);

  const search = useCallback(() => {
    if (selectedCity) {
      fetchProperties(selectedCity, amenityFilters);
    }
  }, [selectedCity, amenityFilters, fetchProperties]);

  const selectCity = useCallback((city: CityInfo) => {
    setSelectedCity(city);
    setQuery(city.name);
    setCitySuggestions([]);
  }, []);

  const clearCity = useCallback(() => {
    setSelectedCity(null);
    setQuery('');
    setResults([]);
    setTotal(0);
    setError(null);
    setHasSearched(false);
  }, []);

  const toggleAmenity = useCallback((code: string) => {
    setAmenityFilters((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }, []);

  return {
    query,
    setQuery,
    citySuggestions,
    selectCity,
    selectedCity,
    clearCity,
    search,
    results,
    hasSearched,
    loading,
    loadingCities,
    error,
    total,
    amenityFilters,
    toggleAmenity,
  };
}