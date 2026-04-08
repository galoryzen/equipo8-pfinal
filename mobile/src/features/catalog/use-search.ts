import { useCallback, useEffect, useRef, useState } from 'react';

import type { AmenitySummary, CityInfo, PropertySummary } from '@src/types/catalog';
import { getAmenities, searchCities, searchProperties } from './catalog-service';

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
  availableAmenities: AmenitySummary[];
  checkin: string;
  checkout: string;
  setDates: (checkin: string, checkout: string) => void;
  guests: number;
  setGuests: (n: number) => void;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  setPriceRange: (min?: number, max?: number) => void;
}

export function useSearch(
  initialCity?: CityInfo | null,
  initialCheckin?: string,
  initialCheckout?: string,
  initialGuests?: number,
): UseSearchResult {
  const defaults = getDefaultDates();
  const [checkin, setCheckin] = useState(initialCheckin || defaults.checkin);
  const [checkout, setCheckout] = useState(initialCheckout || defaults.checkout);
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
  const [availableAmenities, setAvailableAmenities] = useState<AmenitySummary[]>([]);
  const [guests, setGuestsState] = useState(initialGuests ?? 1);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs to access latest state from callbacks without stale closures
  const stateRef = useRef({ hasSearched, selectedCity, amenityFilters, guests, minPrice, maxPrice });
  stateRef.current = { hasSearched, selectedCity, amenityFilters, guests, minPrice, maxPrice };

  const setDates = useCallback((ci: string, co: string) => {
    setCheckin(ci);
    setCheckout(co);
  }, []);

  // Load available amenities from backend on mount
  useEffect(() => {
    getAmenities()
      .then(setAvailableAmenities)
      .catch(() => setAvailableAmenities([]));
  }, []);

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

  // Core fetch — all parameters explicit, no filter state read from closure
  const fetchProperties = useCallback(
    async (
      city: CityInfo,
      guestCount: number,
      amenities: string[],
      priceMin?: number,
      priceMax?: number,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await searchProperties({
          city_id: city.id,
          checkin,
          checkout,
          guests: guestCount,
          amenities: amenities.length > 0 ? amenities : undefined,
          min_price: priceMin,
          max_price: priceMax,
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
    [checkin, checkout],
  );

  // Helper: re-fetch with current filters (reads latest state via ref)
  const refetch = useCallback(
    (overrides?: { city?: CityInfo; guests?: number; amenities?: string[]; minPrice?: number; maxPrice?: number }) => {
      const s = stateRef.current;
      const city = overrides?.city ?? s.selectedCity;
      if (!s.hasSearched || !city) return;
      fetchProperties(
        city,
        overrides?.guests ?? s.guests,
        overrides?.amenities ?? s.amenityFilters,
        overrides?.minPrice !== undefined ? overrides.minPrice : s.minPrice,
        overrides?.maxPrice !== undefined ? overrides.maxPrice : s.maxPrice,
      );
    },
    [fetchProperties],
  );

  // Sync dates and guests when navigation params change
  useEffect(() => {
    if (initialCheckin) setCheckin(initialCheckin);
    if (initialCheckout) setCheckout(initialCheckout);
  }, [initialCheckin, initialCheckout]);

  useEffect(() => {
    if (initialGuests != null) {
      setGuestsState(initialGuests);
      refetch({ guests: initialGuests });
    }
  }, [initialGuests, refetch]);

  // Auto-search when initialCity changes (e.g. navigating back with a new city)
  const prevCityIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialCity && initialCity.id !== prevCityIdRef.current) {
      prevCityIdRef.current = initialCity.id;
      setSelectedCity(initialCity);
      setQuery(initialCity.name);
      setAmenityFilters([]);
      setMinPrice(undefined);
      setMaxPrice(undefined);
      fetchProperties(initialCity, initialGuests ?? 1, []);
    }
  }, [initialCity, initialGuests, fetchProperties]);

  const search = useCallback(() => {
    const s = stateRef.current;
    if (s.selectedCity) {
      fetchProperties(s.selectedCity, s.guests, s.amenityFilters, s.minPrice, s.maxPrice);
    }
  }, [fetchProperties]);

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

  // Setters that trigger re-fetch directly — no useEffect needed
  const setGuests = useCallback((n: number) => {
    setGuestsState(n);
    refetch({ guests: n });
  }, [refetch]);

  const toggleAmenity = useCallback((code: string) => {
    setAmenityFilters((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      refetch({ amenities: next });
      return next;
    });
  }, [refetch]);

  const setPriceRange = useCallback((min?: number, max?: number) => {
    setMinPrice(min);
    setMaxPrice(max);
    refetch({ minPrice: min, maxPrice: max });
  }, [refetch]);

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
    availableAmenities,
    checkin,
    checkout,
    setDates,
    guests,
    setGuests,
    minPrice,
    maxPrice,
    setPriceRange,
  };
}
