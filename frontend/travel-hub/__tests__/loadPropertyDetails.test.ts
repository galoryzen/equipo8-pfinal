import { getPropertyDetail } from '@/app/lib/api/catalog';
import { fetchPropertyDetailsMap } from '@/app/lib/myTrips/loadPropertyDetails';
import type { PropertyDetail } from '@/app/lib/types/catalog';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/api/catalog', () => ({
  getPropertyDetail: vi.fn(),
}));

function minimalDetail(id: string, name: string): PropertyDetail {
  return {
    id,
    hotel_id: 'h1',
    name,
    description: null,
    city: { id: 'c1', name: 'City', department: null, country: 'CO' },
    address: null,
    rating_avg: null,
    review_count: 0,
    popularity_score: 0,
    default_cancellation_policy: null,
    images: [],
    amenities: [],
    policies: [],
    room_types: [],
  };
}

describe('fetchPropertyDetailsMap', () => {
  beforeEach(() => {
    vi.mocked(getPropertyDetail).mockReset();
  });

  it('returns empty object when ids is empty', async () => {
    await expect(fetchPropertyDetailsMap([])).resolves.toEqual({});
    expect(getPropertyDetail).not.toHaveBeenCalled();
  });

  it('maps propertyId to detail for a single id', async () => {
    const d = minimalDetail('p1', 'Hotel One');
    vi.mocked(getPropertyDetail).mockResolvedValue({
      detail: d,
      reviews: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
    });

    const map = await fetchPropertyDetailsMap(['p1']);

    expect(map).toEqual({ p1: d });
    expect(getPropertyDetail).toHaveBeenCalledWith('p1');
  });

  it('fetches multiple ids in parallel', async () => {
    const d1 = minimalDetail('p1', 'A');
    const d2 = minimalDetail('p2', 'B');
    vi.mocked(getPropertyDetail).mockImplementation(async (id: string) => {
      if (id === 'p1')
        return {
          detail: d1,
          reviews: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
        };
      if (id === 'p2')
        return {
          detail: d2,
          reviews: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
        };
      throw new Error('unexpected id');
    });

    const map = await fetchPropertyDetailsMap(['p1', 'p2']);

    expect(map.p1).toEqual(d1);
    expect(map.p2).toEqual(d2);
    expect(getPropertyDetail).toHaveBeenCalledTimes(2);
  });

  it('sets null for a property that fails while others succeed', async () => {
    const d1 = minimalDetail('p1', 'Ok');
    vi.mocked(getPropertyDetail).mockImplementation(async (id: string) => {
      if (id === 'p1')
        return {
          detail: d1,
          reviews: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
        };
      throw new Error('network');
    });

    const map = await fetchPropertyDetailsMap(['p1', 'p-bad']);

    expect(map.p1).toEqual(d1);
    expect(map['p-bad']).toBeNull();
  });
});
