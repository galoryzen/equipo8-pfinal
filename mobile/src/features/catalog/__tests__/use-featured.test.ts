import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useFeatured } from '../use-featured';
import * as catalogService from '../catalog-service';

jest.mock('../catalog-service');
const mockedService = catalogService as jest.Mocked<typeof catalogService>;

const MOCK_DESTINATIONS = [
  { id: '1', name: 'Cancún', country: 'México', image_url: 'https://example.com/cancun.jpg' },
];

const MOCK_PROPERTIES = [
  {
    id: '1',
    name: 'Hotel Test',
    city: { id: '1', name: 'Cancún', country: 'México' },
    rating_avg: 4.5,
    review_count: 10,
    min_price: 120,
    amenities: [],
  },
];

describe('useFeatured', () => {
  afterEach(() => jest.clearAllMocks());

  it('starts in loading state', () => {
    mockedService.getFeaturedDestinations.mockReturnValue(new Promise(() => { }));
    mockedService.getFeaturedProperties.mockReturnValue(new Promise(() => { }));

    const { result } = renderHook(() => useFeatured());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.destinations).toEqual([]);
    expect(result.current.properties).toEqual([]);
  });

  it('loads destinations and properties on mount', async () => {
    mockedService.getFeaturedDestinations.mockResolvedValue(MOCK_DESTINATIONS as any);
    mockedService.getFeaturedProperties.mockResolvedValue(MOCK_PROPERTIES as any);

    const { result } = renderHook(() => useFeatured());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.destinations).toEqual(MOCK_DESTINATIONS);
    expect(result.current.properties).toEqual(MOCK_PROPERTIES);
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch fails', async () => {
    mockedService.getFeaturedDestinations.mockRejectedValue(new Error('Network error'));
    mockedService.getFeaturedProperties.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFeatured());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.destinations).toEqual([]);
    expect(result.current.properties).toEqual([]);
  });

  it('retry re-fetches data', async () => {
    mockedService.getFeaturedDestinations.mockRejectedValueOnce(new Error('fail'));
    mockedService.getFeaturedProperties.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useFeatured());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();

    // Setup success for retry
    mockedService.getFeaturedDestinations.mockResolvedValue(MOCK_DESTINATIONS as any);
    mockedService.getFeaturedProperties.mockResolvedValue(MOCK_PROPERTIES as any);

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.destinations).toEqual(MOCK_DESTINATIONS);
  });
});
