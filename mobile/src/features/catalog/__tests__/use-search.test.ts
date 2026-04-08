import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSearch } from '../use-search';
import * as catalogService from '../catalog-service';
import type { CityInfo } from '@src/types/catalog';

jest.mock('../catalog-service');
const mockedService = catalogService as jest.Mocked<typeof catalogService>;

const MOCK_CITY: CityInfo = {
  id: 'city-1',
  name: 'Cancún',
  department: 'Quintana Roo',
  country: 'México',
};

const MOCK_CITY_2: CityInfo = {
  id: 'city-2',
  name: 'Bogotá',
  department: 'Cundinamarca',
  country: 'Colombia',
};

const MOCK_AMENITIES = [
  { code: 'wifi', name: 'Wi-Fi gratuito' },
  { code: 'pool', name: 'Piscina' },
  { code: 'breakfast', name: 'Desayuno incluido' },
];

const MOCK_SEARCH_RESPONSE = {
  items: [
    {
      id: 'prop-1',
      name: 'Hotel Test',
      city: { id: 'city-1', name: 'Cancún', country: 'México' },
      rating_avg: 4.5,
      review_count: 10,
      min_price: 120,
      amenities: [{ code: 'wifi', name: 'Wi-Fi gratuito' }],
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

describe('useSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockedService.getAmenities.mockResolvedValue(MOCK_AMENITIES);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts with empty state when no initialCity', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.query).toBe('');
    expect(result.current.selectedCity).toBeNull();
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.total).toBe(0);
    expect(result.current.citySuggestions).toEqual([]);
  });

  it('auto-searches when initialCity is provided', async () => {
    mockedService.searchProperties.mockResolvedValue(MOCK_SEARCH_RESPONSE as any);

    const { result } = renderHook(() => useSearch(MOCK_CITY));

    expect(result.current.selectedCity).toEqual(MOCK_CITY);
    expect(result.current.query).toBe('Cancún');

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedService.searchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ city_id: 'city-1', guests: 1 }),
    );
    expect(result.current.results).toEqual(MOCK_SEARCH_RESPONSE.items);
    expect(result.current.total).toBe(1);
    expect(result.current.hasSearched).toBe(true);
  });

  it('fetches city suggestions after debounce when query >= 2 chars', async () => {
    mockedService.searchCities.mockResolvedValue([MOCK_CITY]);

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('Ca');
    });

    // Before debounce fires
    expect(mockedService.searchCities).not.toHaveBeenCalled();

    // Advance past debounce (400ms)
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => expect(result.current.loadingCities).toBe(false));

    expect(mockedService.searchCities).toHaveBeenCalledWith('Ca');
    expect(result.current.citySuggestions).toEqual([MOCK_CITY]);
  });

  it('does not fetch suggestions when query < 2 chars', async () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('C');
    });

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockedService.searchCities).not.toHaveBeenCalled();
    expect(result.current.citySuggestions).toEqual([]);
  });

  it('clears suggestions when a city is selected', async () => {
    mockedService.searchCities.mockResolvedValue([MOCK_CITY]);

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('Ca');
    });

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => expect(result.current.citySuggestions).toHaveLength(1));

    act(() => {
      result.current.selectCity(MOCK_CITY);
    });

    expect(result.current.selectedCity).toEqual(MOCK_CITY);
    expect(result.current.query).toBe('Cancún');
    expect(result.current.citySuggestions).toEqual([]);
  });

  it('search() fetches properties for the selected city', async () => {
    mockedService.searchProperties.mockResolvedValue(MOCK_SEARCH_RESPONSE as any);

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.selectCity(MOCK_CITY);
    });

    await act(async () => {
      result.current.search();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedService.searchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ city_id: 'city-1', guests: 1 }),
    );
    expect(result.current.results).toEqual(MOCK_SEARCH_RESPONSE.items);
    expect(result.current.hasSearched).toBe(true);
  });

  it('search() does nothing when no city is selected', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      result.current.search();
    });

    expect(mockedService.searchProperties).not.toHaveBeenCalled();
  });

  it('clearCity resets all state', async () => {
    mockedService.searchProperties.mockResolvedValue(MOCK_SEARCH_RESPONSE as any);

    const { result } = renderHook(() => useSearch(MOCK_CITY));

    await waitFor(() => expect(result.current.hasSearched).toBe(true));

    act(() => {
      result.current.clearCity();
    });

    expect(result.current.selectedCity).toBeNull();
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error when searchProperties fails', async () => {
    mockedService.searchProperties.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSearch(MOCK_CITY));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.results).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasSearched).toBe(true);
  });

  it('toggleAmenity adds and removes amenity codes', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.toggleAmenity('wifi');
    });

    expect(result.current.amenityFilters).toEqual(['wifi']);

    act(() => {
      result.current.toggleAmenity('pool');
    });

    expect(result.current.amenityFilters).toEqual(['wifi', 'pool']);

    act(() => {
      result.current.toggleAmenity('wifi');
    });

    expect(result.current.amenityFilters).toEqual(['pool']);
  });

  it('initializes with default dates when none provided', () => {
    const { result } = renderHook(() => useSearch());

    // Should have dates set (tomorrow and day after by default)
    expect(result.current.checkin).toBeTruthy();
    expect(result.current.checkout).toBeTruthy();
    expect(result.current.checkin < result.current.checkout).toBe(true);
  });

  it('initializes with provided dates', () => {
    const { result } = renderHook(() =>
      useSearch(null, '2026-04-10', '2026-04-15'),
    );

    expect(result.current.checkin).toBe('2026-04-10');
    expect(result.current.checkout).toBe('2026-04-15');
  });

  it('setDates updates checkin and checkout', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setDates('2026-05-01', '2026-05-05');
    });

    expect(result.current.checkin).toBe('2026-05-01');
    expect(result.current.checkout).toBe('2026-05-05');
  });

  it('search() sends user-selected dates to API', async () => {
    mockedService.searchProperties.mockResolvedValue(MOCK_SEARCH_RESPONSE as any);

    const { result } = renderHook(() =>
      useSearch(null, '2026-06-01', '2026-06-05'),
    );

    act(() => {
      result.current.selectCity(MOCK_CITY);
    });

    await act(async () => {
      result.current.search();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedService.searchProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        city_id: 'city-1',
        checkin: '2026-06-01',
        checkout: '2026-06-05',
      }),
    );
  });

  it('starts with default guests of 1', () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.guests).toBe(1);
  });

  it('initializes with provided guests', () => {
    const { result } = renderHook(() => useSearch(null, undefined, undefined, 3));
    expect(result.current.guests).toBe(3);
  });

  it('syncs guests when initialGuests changes (re-navigation)', async () => {
    mockedService.searchProperties.mockResolvedValue(MOCK_SEARCH_RESPONSE as any);

    const { result, rerender } = renderHook(
      ({ guests }: { guests: number }) => useSearch(MOCK_CITY, undefined, undefined, guests),
      { initialProps: { guests: 3 } },
    );

    await waitFor(() => expect(result.current.hasSearched).toBe(true));
    expect(result.current.guests).toBe(3);

    // Simulate navigating back and returning with different guests
    rerender({ guests: 10 });

    expect(result.current.guests).toBe(10);

    await waitFor(() =>
      expect(mockedService.searchProperties).toHaveBeenCalledWith(
        expect.objectContaining({ guests: 10 }),
      ),
    );
  });

  it('setGuests updates guest count', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setGuests(4);
    });

    expect(result.current.guests).toBe(4);
  });

  it('search() sends guest count to API', async () => {
    mockedService.searchProperties.mockResolvedValue(MOCK_SEARCH_RESPONSE as any);

    const { result } = renderHook(() => useSearch(null, undefined, undefined, 3));

    act(() => {
      result.current.selectCity(MOCK_CITY);
    });

    await act(async () => {
      result.current.search();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedService.searchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ city_id: 'city-1', guests: 3 }),
    );
  });

  it('auto re-searches when guests change after initial search', async () => {
    mockedService.searchProperties.mockResolvedValue(MOCK_SEARCH_RESPONSE as any);

    const { result } = renderHook(() => useSearch(MOCK_CITY));

    await waitFor(() => expect(result.current.hasSearched).toBe(true));

    expect(mockedService.searchProperties).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setGuests(5);
    });

    await waitFor(() =>
      expect(mockedService.searchProperties).toHaveBeenCalledWith(
        expect.objectContaining({ guests: 5 }),
      ),
    );

    expect(mockedService.searchProperties).toHaveBeenCalledTimes(2);
  });

  it('re-searches when initialCity changes', async () => {
    mockedService.searchProperties.mockResolvedValue(MOCK_SEARCH_RESPONSE as any);

    const { result, rerender } = renderHook(
      ({ city }: { city: CityInfo | null }) => useSearch(city),
      { initialProps: { city: MOCK_CITY as CityInfo | null } },
    );

    await waitFor(() => expect(result.current.hasSearched).toBe(true));

    expect(mockedService.searchProperties).toHaveBeenCalledTimes(1);

    // Navigate with a different city
    rerender({ city: MOCK_CITY_2 });

    await waitFor(() =>
      expect(mockedService.searchProperties).toHaveBeenCalledWith(
        expect.objectContaining({ city_id: 'city-2' }),
      ),
    );

    expect(result.current.selectedCity).toEqual(MOCK_CITY_2);
    expect(result.current.query).toBe('Bogotá');
  });

  // ── New: available amenities from backend ──────────────

  it('loads available amenities from backend on mount', async () => {
    const { result } = renderHook(() => useSearch());

    await waitFor(() =>
      expect(result.current.availableAmenities).toEqual(MOCK_AMENITIES),
    );

    expect(mockedService.getAmenities).toHaveBeenCalledTimes(1);
  });

  it('sets empty amenities when getAmenities fails', async () => {
    mockedService.getAmenities.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useSearch());

    await waitFor(() =>
      expect(mockedService.getAmenities).toHaveBeenCalled(),
    );

    expect(result.current.availableAmenities).toEqual([]);
  });

  // ── New: amenity auto-refetch ──────────────────────────

  it('auto re-searches when amenity filters change after initial search', async () => {
    mockedService.searchProperties.mockResolvedValue(MOCK_SEARCH_RESPONSE as any);

    const { result } = renderHook(() => useSearch(MOCK_CITY));

    await waitFor(() => expect(result.current.hasSearched).toBe(true));
    expect(mockedService.searchProperties).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.toggleAmenity('wifi');
    });

    await waitFor(() =>
      expect(mockedService.searchProperties).toHaveBeenCalledWith(
        expect.objectContaining({ amenities: ['wifi'] }),
      ),
    );

    expect(mockedService.searchProperties).toHaveBeenCalledTimes(2);
  });

  // ── New: price range ───────────────────────────────────

  it('starts with undefined price range', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.minPrice).toBeUndefined();
    expect(result.current.maxPrice).toBeUndefined();
  });

  it('setPriceRange updates min and max price', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setPriceRange(50, 200);
    });

    expect(result.current.minPrice).toBe(50);
    expect(result.current.maxPrice).toBe(200);
  });

  it('search() sends price range to API', async () => {
    mockedService.searchProperties.mockResolvedValue(MOCK_SEARCH_RESPONSE as any);

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.selectCity(MOCK_CITY);
    });

    act(() => {
      result.current.setPriceRange(100, 500);
    });

    await act(async () => {
      result.current.search();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedService.searchProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        city_id: 'city-1',
        min_price: 100,
        max_price: 500,
      }),
    );
  });

  it('auto re-searches when price range changes after initial search', async () => {
    mockedService.searchProperties.mockResolvedValue(MOCK_SEARCH_RESPONSE as any);

    const { result } = renderHook(() => useSearch(MOCK_CITY));

    await waitFor(() => expect(result.current.hasSearched).toBe(true));
    expect(mockedService.searchProperties).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setPriceRange(50, 300);
    });

    await waitFor(() =>
      expect(mockedService.searchProperties).toHaveBeenCalledWith(
        expect.objectContaining({ min_price: 50, max_price: 300 }),
      ),
    );

    expect(mockedService.searchProperties).toHaveBeenCalledTimes(2);
  });

  it('setPriceRange with undefined clears the filter', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setPriceRange(50, 200);
    });

    expect(result.current.minPrice).toBe(50);

    act(() => {
      result.current.setPriceRange(undefined, undefined);
    });

    expect(result.current.minPrice).toBeUndefined();
    expect(result.current.maxPrice).toBeUndefined();
  });
});
