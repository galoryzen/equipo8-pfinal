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

const MOCK_SEARCH_RESPONSE = {
  items: [
    {
      id: 'prop-1',
      name: 'Hotel Test',
      city: { id: 'city-1', name: 'Cancún', country: 'México' },
      rating_avg: 4.5,
      review_count: 10,
      min_price: 120,
      amenities: [{ code: 'FREE_WIFI', name: 'Free Wi-Fi' }],
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
      result.current.toggleAmenity('FREE_WIFI');
    });

    expect(result.current.amenityFilters).toEqual(['FREE_WIFI']);

    act(() => {
      result.current.toggleAmenity('POOL');
    });

    expect(result.current.amenityFilters).toEqual(['FREE_WIFI', 'POOL']);

    act(() => {
      result.current.toggleAmenity('FREE_WIFI');
    });

    expect(result.current.amenityFilters).toEqual(['POOL']);
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
});