import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useProperty } from '../use-property';
import * as catalogService from '../catalog-service';

jest.mock('../catalog-service');
const mockedService = catalogService as jest.Mocked<typeof catalogService>;

const MOCK_DETAIL_RESPONSE = {
  detail: {
    id: 'prop-1',
    hotel_id: 'hotel-1',
    name: 'Hotel Test',
    description: 'A nice hotel',
    city: { id: 'city-1', name: 'Cancún', country: 'México' },
    address: 'Calle 1',
    rating_avg: 4.5,
    review_count: 10,
    popularity_score: 100,
    images: [],
    amenities: [{ code: 'wifi', name: 'Wi-Fi gratuito' }],
    policies: [],
    room_types: [],
  },
  reviews: {
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
    total_pages: 0,
  },
};

describe('useProperty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches property detail on mount', async () => {
    mockedService.getPropertyDetail.mockResolvedValue(MOCK_DETAIL_RESPONSE as any);

    const { result } = renderHook(() => useProperty('prop-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedService.getPropertyDetail).toHaveBeenCalledWith('prop-1', {
      checkin: undefined,
      checkout: undefined,
    });
    expect(result.current.property).toEqual(MOCK_DETAIL_RESPONSE.detail);
    expect(result.current.error).toBeNull();
  });

  it('forwards checkin and checkout to the service', async () => {
    mockedService.getPropertyDetail.mockResolvedValue(MOCK_DETAIL_RESPONSE as any);

    renderHook(() =>
      useProperty('prop-1', { checkin: '2026-06-01', checkout: '2026-06-03' }),
    );

    await waitFor(() =>
      expect(mockedService.getPropertyDetail).toHaveBeenCalledWith('prop-1', {
        checkin: '2026-06-01',
        checkout: '2026-06-03',
      }),
    );
  });

  it('re-fetches when dates change', async () => {
    mockedService.getPropertyDetail.mockResolvedValue(MOCK_DETAIL_RESPONSE as any);

    const { rerender } = renderHook(
      ({ ci, co }: { ci?: string; co?: string }) =>
        useProperty('prop-1', { checkin: ci, checkout: co }),
      { initialProps: { ci: '2026-06-01', co: '2026-06-03' } },
    );

    await waitFor(() =>
      expect(mockedService.getPropertyDetail).toHaveBeenLastCalledWith('prop-1', {
        checkin: '2026-06-01',
        checkout: '2026-06-03',
      }),
    );

    rerender({ ci: '2026-07-10', co: '2026-07-12' });

    await waitFor(() =>
      expect(mockedService.getPropertyDetail).toHaveBeenLastCalledWith('prop-1', {
        checkin: '2026-07-10',
        checkout: '2026-07-12',
      }),
    );

    expect(mockedService.getPropertyDetail).toHaveBeenCalledTimes(2);
  });

  it('sets error when fetch fails', async () => {
    mockedService.getPropertyDetail.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useProperty('prop-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.property).toBeNull();
  });

  it('retry re-fetches the property', async () => {
    mockedService.getPropertyDetail
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(MOCK_DETAIL_RESPONSE as any);

    const { result } = renderHook(() => useProperty('prop-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.property).toEqual(MOCK_DETAIL_RESPONSE.detail);
    expect(result.current.error).toBeNull();
    expect(mockedService.getPropertyDetail).toHaveBeenCalledTimes(2);
  });
});
